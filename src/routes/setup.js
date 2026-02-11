const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Page = require('../models/Page');
const { checkEnv, writeEnv, getEnv, loadToProcessEnv } = require('../utils/envManager');

// Configuration Routes
router.get('/config', (req, res) => {
    // Security: Prevent access if already configured
    if (checkEnv()) {
        return res.redirect('/admin/login');
    }
    const env = getEnv();
    res.render('setup-config', { error: null, env });
});

router.post('/config', async (req, res) => {
    // Security: Prevent write if already configured
    if (checkEnv()) {
        return res.redirect('/admin/login');
    }

    try {
        const { MONGO_URI, JWT_SECRET, IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT } = req.body;

        // Basic validation
        if (!MONGO_URI || !JWT_SECRET) {
            throw new Error('Database URI and JWT Secret are required.');
        }

        // Write to .env and Database
        await writeEnv({
            MONGO_URI,
            JWT_SECRET,
            IMAGEKIT_PUBLIC_KEY,
            IMAGEKIT_PRIVATE_KEY,
            IMAGEKIT_URL_ENDPOINT,
            NODE_ENV: 'production', // Default to production for security
            PORT: 3000
        });


        // Reload the environment variables into the current process immediately
        loadToProcessEnv();

        // Force restart instruction (or auto-reload strategies - for now, just render success)
        // Since nodemon restarts on file change, this might just work if we handle connection errors gracefully

        // Redirect to main setup or reload page
        // In a real scenario, we might need to restart the process programmatically or ask user to restart
        // But since we write .env, nodemon might restart.

        res.redirect('/setup?restarted=true');

    } catch (error) {
        res.render('setup-config', { error: error.message, env: req.body });
    }
});

router.get('/', (req, res) => {
    if (!checkEnv()) {
        return res.redirect('/setup/config');
    }
    // Check if we restarted
    if (req.query.restarted) {
        return res.render('setup', { error: 'Configuration saved! Please wait a moment for the server to restart, then refresh this page to create your admin account.' });
    }
    res.render('setup', { error: null });
});

router.post('/', async (req, res) => {
    const { username, email, password, siteTitle } = req.body;

    try {
        // Create Admin User
        const admin = await User.create({
            username,
            email,
            password,
            role: 'admin'
        });

        // Seed Default Pages
        await Page.create([
            {
                title: 'Home',
                slug: 'home',
                content: `
                    <div class="py-20 text-center">
                        <h1 class="text-3xl font-bold mb-4">Welcome to our store!</h1>
                        <p class="text-gray-600">We have switched to use the Page Builder for a better experience.</p>
                    </div>
                `,
                blocks: [
                    {
                        type: 'hero',
                        data: {
                            title: `Welcome to ${siteTitle}`,
                            subtitle: 'Discover our premium collection of products curated just for you.',
                            buttonText: 'Shop Now',
                            buttonUrl: '/shop',
                            image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1600'
                        }
                    },
                    {
                        type: 'feature-list',
                        data: {
                            features: 'Premium Quality, Fast Shipping, 24/7 Support, Secure Payment'
                        }
                    },
                    {
                        type: 'product-grid',
                        data: {
                            title: 'New Arrivals',
                            limit: '4'
                        }
                    }
                ],
                status: 'published',
                author: admin._id
            },
            {
                title: 'Shop',
                slug: 'shop',
                content: '[products limit="12"]',
                status: 'published',
                author: admin._id
            }
        ]);

        // TODO: Save siteTitle to config (if we had a config store)
        // For now, just logging it or could save to a Settings model
        console.log(`Setup complete for site: ${siteTitle}`);

        res.redirect('/admin/login');
    } catch (error) {
        console.error(error);
        res.render('setup', { error: error.message });
    }
});

module.exports = router;
