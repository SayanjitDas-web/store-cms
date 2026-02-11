const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(process.cwd(), '.env');

/**
 * Checks if mandatory environment variables are set.
 * Priority: process.env > .env file
 */
exports.checkEnv = () => {
    // Cloud environments prioritize process.env
    if (process.env.MONGO_URI && process.env.JWT_SECRET) return true;

    if (!fs.existsSync(envPath)) return false;

    try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const config = dotenv.parse(envContent);
        return !!(config.MONGO_URI && config.JWT_SECRET);
    } catch (err) {
        console.error('EnvManager: Error parsing .env during check:', err.message);
        return false;
    }
};

/**
 * Intelligent write/merge for .env file AND Database.
 * Priority: process.env (runtime) > MongoDB (persistent) > .env file (local fallback).
 */
exports.writeEnv = async (data) => {
    // 1. Update Database (Cloud Persistence)
    try {
        const Setting = require('../models/Setting');
        const updatePromises = Object.entries(data).map(([key, value]) => {
            if (value !== undefined && value !== null) {
                return Setting.findOneAndUpdate(
                    { key },
                    { key, value: String(value) },
                    { upsert: true, new: true }
                );
            }
            return null;
        }).filter(p => p !== null);

        await Promise.all(updatePromises);
        console.log('EnvManager: Database settings synchronized.');
    } catch (err) {
        console.warn('EnvManager: Database sync failed (likely not connected yet):', err.message);
    }

    // 2. Update .env File (Local development fallback)
    let lines = [];
    if (fs.existsSync(envPath)) {
        lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    }

    const updatedData = { ...data };
    const newLines = [];
    const processedKeys = new Set();

    for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            newLines.push(line);
            continue;
        }

        const match = line.match(/^([^=#\s]+)\s*=\s*(.*)$/);
        if (match) {
            const key = match[1].trim();
            if (updatedData.hasOwnProperty(key)) {
                const safeValue = String(updatedData[key]).replace(/\n|\r/g, '').trim();
                newLines.push(`${key}=${safeValue}`);
                processedKeys.add(key);
                // Also update process.env for immediate use
                process.env[key] = safeValue;
            } else {
                newLines.push(line);
            }
        } else {
            newLines.push(line);
        }
    }

    for (const [key, value] of Object.entries(updatedData)) {
        if (!processedKeys.has(key) && value !== undefined && value !== null) {
            const safeValue = String(value).replace(/\n|\r/g, '').trim();
            newLines.push(`${key}=${safeValue}`);
            process.env[key] = safeValue;
        }
    }

    try {
        fs.writeFileSync(envPath, newLines.join('\n'));
        console.log('EnvManager: .env file updated.');
        return true;
    } catch (err) {
        if (err.code === 'EROFS') {
            console.warn('EnvManager: Read-Only File System. Setting only saved to Database.');
        } else {
            console.error('EnvManager: .env write failed:', err.message);
        }
        return false;
    }
};

/**
 * Loads settings from MongoDB into process.env.
 * Should be called after DB connection is established.
 */
exports.loadFromDatabase = async () => {
    try {
        const Setting = require('../models/Setting');
        const settings = await Setting.find({});
        settings.forEach(setting => {
            // Priority: Don't overwrite process.env if it was set via OS/Cloud Dashboard
            if (!process.env[setting.key] || process.env[setting.key] === '') {
                process.env[setting.key] = setting.value;
            }
        });
        console.log(`EnvManager: Loaded ${settings.length} settings from Database.`);
    } catch (err) {
        console.error('EnvManager: Failed to load settings from Database:', err.message);
    }
};


/**
 * Get effective environment variables with masking for sensitive keys.
 */
exports.getEnv = (maskSecrets = false) => {
    let fileEnv = {};
    if (fs.existsSync(envPath)) {
        try {
            fileEnv = dotenv.parse(fs.readFileSync(envPath));
        } catch (e) { }
    }

    const keys = [
        'MONGO_URI', 'JWT_SECRET', 'PORT', 'NODE_ENV',
        'IMAGEKIT_PUBLIC_KEY', 'IMAGEKIT_PRIVATE_KEY', 'IMAGEKIT_URL_ENDPOINT'
    ];

    const result = { ...fileEnv };

    // Merge process.env overrides
    keys.forEach(key => {
        if (process.env[key]) result[key] = process.env[key];
    });

    if (maskSecrets) {
        const sensitiveKeys = ['JWT_SECRET', 'IMAGEKIT_PRIVATE_KEY', 'MONGO_URI'];
        sensitiveKeys.forEach(key => {
            if (result[key]) {
                const val = result[key];
                result[key] = val.length > 8 ? val.substring(0, 4) + '****' + val.slice(-4) : '****';
            }
        });
    }

    return result;
};

/**
 * Loads .env into process.env
 */
exports.loadToProcessEnv = () => {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
    }
};

