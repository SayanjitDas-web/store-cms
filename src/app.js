// require('dotenv').config();
const { loadToProcessEnv } = require('./utils/envManager');
loadToProcessEnv();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const helmet = require('helmet');
// const mongoSanitize = require('express-mongo-sanitize'); // Incompatible with Express 5
// const xss = require('xss-clean'); // Incompatible with Express 5
const { mongoSanitize, xssSanitize } = require('./middlewares/security');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const PluginManager = require('./core/PluginManager');
const HookSystem = require('./core/HookSystem');

const app = express();

// Trust Proxy for Cloud Hosting (Heroku, Render, AWS)
app.set('trust proxy', 1);

// Connect to Database (Graceful)
(async () => {
    try {
        await connectDB();
    } catch (err) {
        console.log("Database connection failed (likely missing config). Starting in Setup Mode.");
    }
})();

// Middleware
app.use(logger('dev'));
app.use(express.json({ limit: '10kb' })); // Body limit
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Session Configuration
const session = require('express-session');
const MongoStore = require('connect-mongo');

app.use(session({
    secret: process.env.JWT_SECRET || 'secret_key', // shared secret
    resave: false,
    saveUninitialized: false,
    store: (MongoStore.create || MongoStore.default.create)({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        secure: process.env.NODE_ENV === 'production'
    }
}));

// Cart & User Middleware (Make data available to all views)
// NOTE: We'll move this further down after loadUser is applied globally

// Security Headers
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for now to allow external scripts (TinyMCE, ImageKit) easily
}));

// Sanitize data
app.use(mongoSanitize());

// Prevent XSS
app.use(xssSanitize());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 mins
    max: 100, // 100 requests per windowMs
    skip: (req) => req.path.startsWith('/admin')
});
app.use(limiter);

app.use(express.static(path.join(__dirname, 'public')));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const { loadUser } = require('./middlewares/authMiddleware');

const checkInstalled = require('./middlewares/installMiddleware');

// Apply loadUser globally before any routes
app.use(loadUser);

// Global Locals Setup (Cart and User for EJS)
app.use(async (req, res, next) => {
    res.locals.cart = req.session ? (req.session.cart || { items: [], total: 0 }) : { items: [], total: 0 };
    res.locals.user = req.user || null;
    res.locals.currentPath = req.path;

    // Global Navigation for Frontend
    if (!req.path.startsWith('/admin') && !req.path.startsWith('/api') && !req.path.startsWith('/setup')) {
        const defaultLinks = [
            { title: 'Home', url: '/' },
            { title: 'Shop', url: '/shop' },
            { title: 'Cart', url: '/cart' }
        ];
        res.locals.navLinks = await HookSystem.applyFilter('header_nav_links', defaultLinks);
        res.locals.logo = await HookSystem.applyFilter('header_logo', { type: 'text', content: 'StoreCMS' });
    }
    next();
});

// Setup Check Middleware (Runs on every request)
app.use(checkInstalled);

// Initialize Plugins
(async () => {
    await PluginManager.loadPlugins(app);

    // Global Navigation Middleware (Runs after plugins are loaded)
    app.use(async (req, res, next) => {
        // Only apply to frontend routes
        if (!req.path.startsWith('/admin') && !req.path.startsWith('/api') && !req.path.startsWith('/setup')) {
            const defaultLinks = [
                { title: 'Home', url: '/' },
                { title: 'Shop', url: '/shop' },
                { title: 'Cart', url: '/cart' }
            ];
            const HookSystem = require('./core/HookSystem');
            res.locals.navLinks = await HookSystem.applyFilter('header_nav_links', defaultLinks);
        }
        next();
    });

    // Core Routes (Hooks can modify these)
    app.use('/setup', require('./routes/setup'));
    app.use('/admin', require('./routes/admin'));
    app.use('/customer', require('./routes/customer'));
    app.use('/api', require('./routes/api'));
    app.use('/api/auth', require('./routes/auth'));
    app.use('/', require('./routes/index')); // Catch-all must be last

    // Global Error Handler
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).send('Something broke!');
    });

})();

module.exports = app;
