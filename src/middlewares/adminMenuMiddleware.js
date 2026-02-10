const HookSystem = require('../core/HookSystem');

module.exports = async (req, res, next) => {
    try {
        // Default Menu Items
        let menu = [
            { title: 'Dashboard', link: '/admin/dashboard', icon: 'bi-speedometer2' },
            { title: 'Pages', link: '/admin/pages', icon: 'bi-file-earmark-text' },
            { title: 'Media', link: '/admin/media', icon: 'bi-images' },
            { title: 'Plugins', link: '/admin/plugins', icon: 'bi-puzzle' }
            // Users, Settings etc. can be added here
        ];

        // Apply Filters (allow plugins to add/remove items)
        menu = await HookSystem.applyFilter('admin_sidebar_menu', menu);

        // Make available to views
        res.locals.adminMenu = menu;
        res.locals.currentPath = req.path; // For active state
        next();
    } catch (err) {
        console.error('Admin Menu Middleware Error:', err);
        // Fallback if hook system fails
        res.locals.adminMenu = [
            { title: 'Dashboard', link: '/admin/dashboard', icon: 'bi-speedometer2' }
        ];
        next();
    }
};
