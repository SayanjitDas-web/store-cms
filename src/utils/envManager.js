const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');

exports.checkEnv = () => {
    // Check Process Environment Variables (Priority for Cloud Hosting)
    if (process.env.MONGO_URI && process.env.JWT_SECRET) {
        return true;
    }

    if (!fs.existsSync(envPath)) return false;

    // Basic check for required keys in .env file
    const envContent = fs.readFileSync(envPath, 'utf8');
    // We can add more specific checks here if needed
    return envContent.includes('MONGO_URI') && envContent.includes('JWT_SECRET');
};

exports.writeEnv = (data) => {
    let envContent = '';

    // Convert object to KEY=VALUE strings
    for (const [key, value] of Object.entries(data)) {
        if (value) {
            envContent += `${key}=${value}\n`;
        }
    }

    fs.writeFileSync(envPath, envContent);
};

const dotenv = require('dotenv');

exports.getEnv = () => {
    let env = {};
    if (fs.existsSync(envPath)) {
        env = dotenv.parse(fs.readFileSync(envPath));
    }

    // Merge with process.env for specific keys if needed (or just trust process.env)
    // The previous logic manualy manually merged specific keys.
    // Let's keep the priority: process.env > .env file

    // Actually, getEnv is mostly used for reading config to display in UI or write back.
    // If we want the *effective* env, we should look at process.env AFTER loading.
    // But this function seems to return "what is in the file" + "what is in process override".

    if (process.env.MONGO_URI) env.MONGO_URI = process.env.MONGO_URI;
    if (process.env.JWT_SECRET) env.JWT_SECRET = process.env.JWT_SECRET;
    if (process.env.IMAGEKIT_PUBLIC_KEY) env.IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY;
    if (process.env.IMAGEKIT_PRIVATE_KEY) env.IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
    if (process.env.IMAGEKIT_URL_ENDPOINT) env.IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT;

    return env;
};

exports.loadToProcessEnv = () => {
    dotenv.config({ path: envPath });
};
