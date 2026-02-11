const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { loadToProcessEnv } = require('../utils/envManager');
// Note: HookSystem is required inside the function to avoid circular dependencies if any, 
// strictly speaking it's fine at top level but good to be safe. 
// Actually, I already required it inside the function in the previous step. 
// So I don't need to add it here.

// Generate JWT
const generateToken = (id) => {
    // Safety check for stale env
    if (!process.env.JWT_SECRET) {
        console.log('JWT_SECRET missing, attempting to reload env...');
        loadToProcessEnv();
    }

    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined in environment variables');
    }

    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    const { username, email, password, role } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Allow creating first admin
        const count = await User.countDocuments({});
        const userRole = count === 0 ? 'admin' : (role || 'customer');

        const user = await User.create({
            username,
            email,
            password,
            role: userRole
        });

        if (user) {
            const token = generateToken(user._id);
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });

            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                token
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            const token = generateToken(user._id);

            // Fire Action Hook
            const HookSystem = require('../core/HookSystem');
            HookSystem.doAction('user_login', user);

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });

            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                token
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({
            message: 'Server error during login',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Public
exports.logout = (req, res) => {
    // Clear JWT Cookie
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0)
    });

    // Destroy Session (clears cart, etc.)
    if (req.session) {
        req.session.destroy(err => {
            if (err) console.error('Error destroying session:', err);
            res.redirect('/');
        });
    } else {
        res.redirect('/');
    }
};
