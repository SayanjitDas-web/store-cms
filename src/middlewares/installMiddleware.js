const User = require('../models/User');

const { checkEnv } = require('../utils/envManager');

const checkInstalled = async (req, res, next) => {
    try {
        if (!checkEnv()) {
            if (req.path.startsWith('/setup/config') || req.path.startsWith('/public')) {
                return next();
            }
            return res.redirect('/setup/config');
        }

        const count = await User.countDocuments({});
        if (count === 0 && req.path !== '/setup' && !req.path.startsWith('/setup/config') && !req.path.startsWith('/public')) {
            return res.redirect('/setup');
        }
        if (count > 0 && req.path.startsWith('/setup')) {
            return res.redirect('/admin/login');
        }
        next();
    } catch (error) {
        // If DB is not connected (which might happen if env is wrong), we might catch error here
        // We should redirect to config if DB connection fails actually
        console.error("Middleware Error:", error.message);
        if (req.path.startsWith('/setup/config') || req.path.startsWith('/public')) {
            return next();
        }
        return res.redirect('/setup/config');
    }
};

module.exports = checkInstalled;
