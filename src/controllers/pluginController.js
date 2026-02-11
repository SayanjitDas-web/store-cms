const PluginManager = require('../core/PluginManager');
const multer = require('multer');
const path = require('path');

// Multer Config for Zip Uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.zip' && file.mimetype !== 'application/zip' && file.mimetype !== 'application/x-zip-compressed') {
            return cb(new Error('Only zip files are allowed'));
        }
        cb(null, true);
    }
}).single('plugin');

// @desc    Get all plugins
// @route   GET /admin/plugins
// @access  Private/Admin
exports.getPlugins = async (req, res) => {
    try {
        // We read from PluginManager which has the config-loaded state
        const plugins = PluginManager.plugins;
        res.render('admin/plugins/index', { plugins, error: null, success: null });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Upload new plugin
// @route   POST /admin/plugins/upload
// @access  Private/Admin
exports.uploadPlugin = [
    upload,
    async (req, res) => {
        try {
            if (!req.file) {
                // Return to view with error (simplified)
                const plugins = PluginManager.plugins;
                return res.render('admin/plugins/index', { plugins, error: 'Please select a file', success: null });
            }

            const result = await PluginManager.installPlugin(req.file.buffer);

            const plugins = PluginManager.plugins;
            if (result.success) {
                // Reload plugins to make it active immediately
                // Note: In a real app, we might need to restart the process.
                // For now, let's try to reload them dynamically or ask for restart.
                // Dynamic reload attempt:
                await PluginManager.loadPlugin(result.name, path.join(PluginManager.pluginsDir, result.name), req.app);

                // Re-fetch plugins after load
                const updatedPlugins = PluginManager.plugins;
                return res.render('admin/plugins/index', { plugins: updatedPlugins, error: null, success: 'Plugin installed successfully!' });
            } else {
                return res.render('admin/plugins/index', { plugins, error: result.message, success: null });
            }

        } catch (err) {
            console.error(err);
            const plugins = PluginManager.plugins;
            res.render('admin/plugins/index', { plugins, error: err.message, success: null });
        }
    }
];

// @desc    Toggle plugin (enable/disable)
// @route   POST /admin/plugins/toggle/:name
// @access  Private/Admin
exports.togglePlugin = async (req, res) => {
    const { name } = req.params;
    const enable = req.body.enable === 'true';

    try {
        await PluginManager.togglePlugin(name, enable);
        // We need to restart to apply changes fully, but for now redirect
        res.redirect('/admin/plugins');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/plugins');
    }
};

// @desc    Delete plugin
// @route   POST /admin/plugins/delete/:name
// @access  Private/Admin
exports.deletePlugin = async (req, res) => {
    const { name } = req.params;
    try {
        await PluginManager.removePlugin(name);
        res.redirect('/admin/plugins');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/plugins');
    }
};
