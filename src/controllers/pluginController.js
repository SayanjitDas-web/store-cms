const PluginManager = require('../core/PluginManager');

// @desc    Get all plugins
// @route   GET /admin/plugins
// @access  Private/Admin
exports.getPlugins = async (req, res) => {
    try {
        // Reload plugins to check for new ones (optional, maybe performance heavy)
        // await PluginManager.loadPlugins(); 

        const plugins = PluginManager.plugins;
        res.render('admin/plugins/index', { plugins });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Toggle plugin (enable/disable) - Placeholder for now
// @route   POST /admin/plugins/toggle/:name
// @access  Private/Admin
exports.togglePlugin = async (req, res) => {
    // TODO: Implement enable/disable logic in PluginManager and persist to config
    res.redirect('/admin/plugins');
};
