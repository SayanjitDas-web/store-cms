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
connectDB().then(() => {
    const { loadFromDatabase } = require('./utils/envManager');
    return loadFromDatabase();
}).catch(err => {
    console.log("Database connection failed (likely missing config). Starting in Setup Mode.");
});


// Middleware
app.use(logger('dev'));
app.use(express.json({ limit: '10kb' })); // Body limit
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Session Configuration
const session = require('express-session');
const MongoStore = require('connect-mongo');

const sessionConfig = {
    secret: process.env.JWT_SECRET || 'secret_key', // shared secret
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        secure: process.env.NODE_ENV === 'production'
    }
};

if (process.env.MONGO_URI) {
    sessionConfig.store = (MongoStore.create || MongoStore.default.create)({ mongoUrl: process.env.MONGO_URI });
}

app.use(session(sessionConfig));

// Security Headers
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for now to allow external scripts (TinyMCE, ImageKit) easily
}));

// Sanitize data
app.use(mongoSanitize());

// Prevent XSS
app.use(xssSanitize());

// Static Files (Before Limiter and loadUser to avoid unnecessary processing)
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware (To identify user roles for bypassing)
const { loadUser } = require('./middlewares/authMiddleware');
const checkInstalled = require('./middlewares/installMiddleware');
app.use(loadUser);


// Optimized Rate Limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 200, // 200 requests for customers
    // Securely bypass for Admin and Editor roles
    skip: (req) => {
        const bypassRoles = ['admin', 'editor'];
        return req.user && bypassRoles.includes(req.user.role);
    }
});
app.use(limiter);

// View Engine
app.set('view engine', 'ejs');
app.set('views', [path.join(__dirname, 'views')]);


// Global Locals Setup (Cart and User for EJS)
app.use(async (req, res, next) => {
    res.locals.cart = req.session ? (req.session.cart || { items: [], total: 0 }) : { items: [], total: 0 };
    res.locals.user = req.user || null;
    res.locals.currentPath = req.path;

    // Flash Messages
    res.locals.error = req.session.error || null;
    res.locals.success = req.session.success || null;
    if (req.session) {
        delete req.session.error;
        delete req.session.success;
    }

    // Global Navigation for Frontend (Initial defaults)
    if (!req.path.startsWith('/admin') && !req.path.startsWith('/api') && !req.path.startsWith('/setup')) {
        const defaultLinks = [
            { title: 'Home', url: '/' },
            { title: 'Shop', url: '/shop' },
            { title: 'Cart', url: '/cart' }
        ];
        res.locals.navLinks = await HookSystem.applyFilter('header_nav_links', defaultLinks);
        res.locals.logo = await HookSystem.applyFilter('header_logo', { type: 'text', content: 'StoreCMS' });

        // Content Hooks
        res.locals.headContent = await HookSystem.applyFilter('head_content', '');
        res.locals.headerContent = await HookSystem.applyFilter('frontend_header', '');
        res.locals.footerContent = await HookSystem.applyFilter('frontend_footer', '');
    }
    next();
});

// Setup Check Middleware (Runs on every request)
app.use(checkInstalled);

// Initialize Plugins and Routes
// Since loadPlugins is async, we use a promise.then or just wait for it before mounting routes.
// However, in Express 4/5, routes mounted after an async call might not be registered correctly
// if the request comes in before they are ready. 
// A better way is to wait for plugins to load before starting the server, 
// but for now, we'll keep it simple and ensure core routes are registered.

PluginManager.loadPlugins(app).then(() => {
    console.log('All plugins loaded successfully');

    // Mount core routes AFTER plugins might have registered hooks/filters
    app.use('/setup', require('./routes/setup'));
    app.use('/admin', require('./routes/admin'));
    app.use('/customer', require('./routes/customer'));
    app.use('/api', require('./routes/api'));
    app.use('/api/auth', require('./routes/auth'));
    app.use('/', require('./routes/index')); // Catch-all must be last

    // 404 Handler (Runs if no route matches)
    app.use((req, res, next) => {
        res.status(404).render('error', {
            status: 404,
            message: 'Oops! The page you are looking for does not exist.',
            error: {}
        });
    });

    // Silence Chrome internal diagnostic noise
    app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => res.status(204).end());

    // Global Error Handler
    app.use((err, req, res, next) => {
        console.error(err.stack);
        const status = err.status || 500;
        res.status(status).render('error', {
            status,
            message: process.env.NODE_ENV === 'production'
                ? 'Something went wrong on our end. We are looking into it.'
                : err.message,
            error: process.env.NODE_ENV === 'development' ? err : {}
        });
    });
});

module.exports = app;
