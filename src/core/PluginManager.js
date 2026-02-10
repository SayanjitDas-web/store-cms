const fs = require('fs');
const path = require('path');
const HookSystem = require('./HookSystem');
const MediaAPI = require('../utils/mediaManager');
const { protect } = require('../middlewares/authMiddleware');
const adminMenuMiddleware = require('../middlewares/adminMenuMiddleware');

class PluginManager {
    constructor() {
        this.plugins = {};
        this.pluginsDir = path.join(process.cwd(), 'plugins');
    }

    async loadPlugins(app) {
        if (!fs.existsSync(this.pluginsDir)) {
            fs.mkdirSync(this.pluginsDir);
            return;
        }

        const pluginFolders = fs.readdirSync(this.pluginsDir);

        for (const folder of pluginFolders) {
            const pluginPath = path.join(this.pluginsDir, folder);
            if (fs.lstatSync(pluginPath).isDirectory()) {
                await this.loadPlugin(folder, pluginPath, app);
            }
        }
    }

    async loadPlugin(name, pluginPath, app) {
        try {
            const manifestPath = path.join(pluginPath, 'manifest.json');
            if (!fs.existsSync(manifestPath)) {
                console.warn(`Plugin ${name}: manifest.json not found. Skipping.`);
                return;
            }

            const manifest = require(manifestPath);
            // Check if plugin is enabled from config (TODO: Implement config check)
            // For now, load all valid plugins

            const entryPoint = path.join(pluginPath, manifest.main || 'index.js');
            if (fs.existsSync(entryPoint)) {
                const plugin = require(entryPoint);
                if (typeof plugin.init === 'function') {
                    await plugin.init(app, HookSystem, MediaAPI, { protect, adminMenuMiddleware });
                    console.log(`Plugin loaded: ${manifest.name} v${manifest.version}`);
                    this.plugins[name] = { ...manifest, instance: plugin };
                } else {
                    console.warn(`Plugin ${name}: init function not found in entry point.`);
                }
            }
        } catch (error) {
            console.error(`Failed to load plugin ${name}:`, error);
        }
    }
}

module.exports = new PluginManager();
