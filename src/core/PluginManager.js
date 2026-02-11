const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip'); // Requires 'npm install adm-zip'
const HookSystem = require('./HookSystem');
const MediaAPI = require('../utils/mediaManager');
const { protect } = require('../middlewares/authMiddleware');
const adminMenuMiddleware = require('../middlewares/adminMenuMiddleware');

class PluginManager {
    constructor() {
        this.plugins = {};
        this.pluginsDir = path.join(process.cwd(), 'plugins');
        this.configFile = path.join(process.cwd(), 'plugin-config.json');
        this.config = this.loadConfig();
    }

    loadConfig() {
        if (!fs.existsSync(this.configFile)) {
            return { plugins: {} };
        }
        try {
            return JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
        } catch (error) {
            console.error('Error loading plugin config:', error);
            return { plugins: {} };
        }
    }

    saveConfig() {
        fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
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

            // Check Config for Active State
            // Default to true if not in config
            let isActive = this.config.plugins[name] !== false;

            // Hardcode protection for core plugins
            // ecommerce-core is always active
            if (name === 'ecommerce-core') {
                isActive = true;
            }

            const pluginData = {
                ...manifest,
                // We use the folder name as the key for operations, but manifest.name for display/identity if needed.
                // Actually, the system uses 'name' (folder name) for keys in this.plugins.
                // Let's add flags for UI
                canUninstall: !['ecommerce-core', 'nav-manager', 'page-builder'].includes(name),
                canToggle: name !== 'ecommerce-core'
            };

            if (isActive) {
                const entryPoint = path.join(pluginPath, manifest.main || 'index.js');
                if (fs.existsSync(entryPoint)) {
                    const plugin = require(entryPoint);
                    if (typeof plugin.init === 'function') {
                        // Pass this (PluginManager) to init so plugins can use it without requiring it
                        await plugin.init(app, HookSystem, MediaAPI, { protect, adminMenuMiddleware }, this);
                        console.log(`Plugin loaded: ${manifest.name} v${manifest.version}`);
                        this.plugins[name] = { ...pluginData, instance: plugin, active: true };
                    } else {
                        console.warn(`Plugin ${name}: init function not found.`);
                        this.plugins[name] = { ...pluginData, active: false, error: 'Init missing' };
                    }
                }
            } else {
                // Plugin is disabled, but we still track it for the UI
                this.plugins[name] = { ...pluginData, active: false };
            }
        } catch (error) {
            console.error(`Failed to load plugin ${name}:`, error);
            this.plugins[name] = { name, active: false, error: error.message };
        }
    }

    async installPlugin(zipPath) {
        try {
            const zip = new AdmZip(zipPath);
            const zipEntries = zip.getEntries();

            // Find root folder name or assume generic
            // We need to extract to plugins/FOLDER_NAME
            // Let's assume the zip contains a folder. 
            // If not, we might need a manifest check to get the name.

            // Revised approach: Extract to a temp folder, read manifest, then move.
            const tempDir = path.join(this.pluginsDir, '_temp_install');
            if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
            fs.mkdirSync(tempDir);

            zip.extractAllTo(tempDir, true);

            // Find manifest
            // Check if extracted content is a single folder or loose files
            const files = fs.readdirSync(tempDir);
            let pluginRoot = tempDir;

            if (files.length === 1 && fs.lstatSync(path.join(tempDir, files[0])).isDirectory()) {
                pluginRoot = path.join(tempDir, files[0]);
            }

            const manifestPath = path.join(pluginRoot, 'manifest.json');
            if (!fs.existsSync(manifestPath)) {
                throw new Error('Invalid Plugin: manifest.json missing.');
            }

            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            const pluginName = manifest.name;

            if (!pluginName) throw new Error('Invalid Manifest: Name missing.');

            const finalPath = path.join(this.pluginsDir, pluginName);

            // Move from temp to final
            if (fs.existsSync(finalPath)) {
                // Determine if we overwrite or error. For now, overwrite.
                fs.rmSync(finalPath, { recursive: true, force: true });
            }

            // Rename/Move
            //fs.renameSync(pluginRoot, finalPath); // Rename might fail across volumes, safer to copy/move
            // Actually, since we are in same volume usually, renameSync works. 
            // But let's use a robust copy function or just move if possible.
            // fs.cpSync is available in Node 16.7+
            fs.cpSync(pluginRoot, finalPath, { recursive: true });

            // Cleanup temp
            fs.rmSync(tempDir, { recursive: true, force: true });

            // Enable by default
            this.config.plugins[pluginName] = true;
            this.saveConfig();

            // Rebuild CSS to include new plugin styles
            const { exec } = require('child_process');
            exec('npm run build', (err, stdout, stderr) => {
                if (err) console.error('CSS Build Error:', err);
                else console.log('CSS Rebuilt Successfully');
            });

            return { success: true, name: pluginName };
        } catch (error) {
            console.error('Install Error:', error);
            return { success: false, message: error.message };
        }
    }

    async removePlugin(name) {
        // Protect Core Plugins
        if (['ecommerce-core', 'nav-manager', 'page-builder'].includes(name)) {
            return { success: false, message: 'Cannot uninstall core plugins.' };
        }

        const pluginPath = path.join(this.pluginsDir, name);
        if (fs.existsSync(pluginPath)) {
            fs.rmSync(pluginPath, { recursive: true, force: true });
            delete this.plugins[name];
            delete this.config.plugins[name];
            this.saveConfig();
            return { success: true };
        }
        return { success: false, message: 'Plugin not found' };
    }

    async togglePlugin(name, enable) {
        // Protect Core Plugins
        if (name === 'ecommerce-core' && !enable) {
            return { success: false, message: 'Cannot deactivate ecommerce-core.' };
        }

        this.config.plugins[name] = enable;
        this.saveConfig();

        // Update in-memory state so UI reflects change immediately
        if (this.plugins[name]) {
            this.plugins[name].active = enable;
        }

        return { success: true, restartRequired: true };
    }

    isPluginActive(name) {
        // Check config first (source of truth for user intent)
        if (this.config.plugins[name] === false) return false;

        // Then check if it's actually loaded in memory
        if (!this.plugins[name]) return false;

        return this.plugins[name].active !== false;
    }
}

module.exports = new PluginManager();
