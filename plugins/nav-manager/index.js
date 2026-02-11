const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

// Define NavItem Model Schema
const NavItemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    url: { type: String, required: true },
    order: { type: Number, default: 0 },
    target: { type: String, default: '_self' }, // _self or _blank
    createdAt: { type: Date, default: Date.now }
});

let NavItem;
try {
    NavItem = mongoose.model('NavItem');
} catch {
    NavItem = mongoose.model('NavItem', NavItemSchema);
}

// Define NavSettings Model Schema
const NavSettingsSchema = new mongoose.Schema({
    key: { type: String, unique: true }, // e.g., 'header_logo'
    value: {
        type: { type: String, enum: ['text', 'image'], default: 'text' },
        content: { type: String, default: 'StoreCMS' }
    }
});

let NavSettings;
try {
    NavSettings = mongoose.model('NavSettings');
} catch {
    NavSettings = mongoose.model('NavSettings', NavSettingsSchema);
}

module.exports = {
    name: 'nav-manager',
    version: '1.0.0',
    description: 'Dynamic navigation and header management for StoreCMS.',

    init: async (app, HookSystem, MediaAPI, options, PluginManager) => {
        const { protect, adminMenuMiddleware } = options;
        console.log('Navigation Manager Plugin Initialized');
        // const PluginManager = require('../../src/core/PluginManager'); // Avoid circular dependency

        // Register Views
        const viewsPath = path.join(__dirname, 'views');
        const existingViews = app.get('views');
        if (Array.isArray(existingViews)) {
            if (!existingViews.includes(viewsPath)) {
                app.set('views', [...existingViews, viewsPath]);
            }
        } else {
            app.set('views', [existingViews, viewsPath]);
        }

        const adminRouter = express.Router();
        if (protect) adminRouter.use(protect);
        if (adminMenuMiddleware) adminRouter.use(adminMenuMiddleware);

        // Active Check Middleware
        adminRouter.use((req, res, next) => {
            if (!PluginManager.isPluginActive('nav-manager')) {
                return res.status(403).send('Plugin is disabled');
            }
            next();
        });

        // --- Admin Routes ---

        // List Nav Items
        adminRouter.get('/', async (req, res) => {
            try {
                const navItems = await NavItem.find().sort({ order: 1 });

                // Fetch settings
                let settings = await NavSettings.findOne({ key: 'header_logo' });
                if (!settings) {
                    settings = { value: { type: 'text', content: 'StoreCMS' } };
                }

                // Fetch available pages
                const Page = mongoose.model('Page');
                const pages = await Page.find({ status: 'published' }).sort({ title: 1 });

                res.render('nav-manager/index', { navItems, pages, logo: settings.value });
            } catch (err) {
                res.status(500).send(err.message);
            }
        });

        // Update Logo Settings
        adminRouter.post('/settings', async (req, res) => {
            try {
                const { logoType, logoContent, logoContentImage } = req.body;
                const finalContent = logoType === 'image' ? logoContentImage : logoContent;

                await NavSettings.findOneAndUpdate(
                    { key: 'header_logo' },
                    {
                        key: 'header_logo',
                        value: { type: logoType, content: finalContent }
                    },
                    { upsert: true, new: true }
                );
                res.redirect('/admin/navigation');
            } catch (err) {
                res.status(500).send(err.message);
            }
        });

        // Add Nav Item
        adminRouter.post('/', async (req, res) => {
            try {
                await NavItem.create(req.body);
                res.redirect('/admin/navigation');
            } catch (err) {
                res.status(500).send(err.message);
            }
        });

        // Update Nav Item
        adminRouter.post('/edit/:id', async (req, res) => {
            try {
                await NavItem.findByIdAndUpdate(req.params.id, req.body);
                res.redirect('/admin/navigation');
            } catch (err) {
                res.status(500).send(err.message);
            }
        });

        // Delete Nav Item
        adminRouter.post('/delete/:id', async (req, res) => {
            try {
                await NavItem.findByIdAndDelete(req.params.id);
                res.redirect('/admin/navigation');
            } catch (err) {
                res.status(500).send(err.message);
            }
        });

        app.use('/admin/navigation', adminRouter);

        // --- Hooks & Filters ---

        // Add to Admin Sidebar
        HookSystem.addFilter('admin_sidebar_menu', (menu) => {
            if (!PluginManager.isPluginActive('nav-manager')) return menu;
            menu.push({
                title: 'Navigation',
                link: '/admin/navigation',
                icon: 'bi-compass',
                order: 15
            });
            return menu;
        });

        // Filter for Frontend Navigation
        HookSystem.addFilter('header_nav_links', async (links) => {
            if (!PluginManager.isPluginActive('nav-manager')) return links;
            const dbLinks = await NavItem.find().sort({ order: 1 });
            if (dbLinks.length > 0) {
                // If the user has defined links, replace the default ones
                return dbLinks.map(item => ({
                    title: item.title,
                    url: item.url,
                    target: item.target
                }));
            }
            return links; // Fallback to whatever was originally passed
        });

        // Filter for Frontend Logo
        HookSystem.addFilter('header_logo', async (defaultLogo) => {
            if (!PluginManager.isPluginActive('nav-manager')) return defaultLogo;
            const settings = await NavSettings.findOne({ key: 'header_logo' });
            if (settings) {
                return settings.value;
            }
            return { type: 'text', content: (typeof defaultLogo === 'string' ? defaultLogo : (defaultLogo?.content || 'StoreCMS')) };
        });
    }
};
