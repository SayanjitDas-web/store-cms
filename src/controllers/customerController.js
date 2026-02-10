const User = require('../models/User');
const mongoose = require('mongoose');

// Helper to get Order model
const getOrderModel = () => {
    try {
        return mongoose.model('Order');
    } catch {
        // Fallback or just return null if not initialized yet
        return null;
    }
};

// @desc    Get Signup Page
// @route   GET /customer/signup
// @access  Public
exports.getSignup = (req, res) => {
    if (req.user) {
        return res.redirect('/customer/profile');
    }
    res.render('customer/signup');
};

// @desc    Get Login Page
// @route   GET /customer/login
// @access  Public
exports.getLogin = (req, res) => {
    if (req.user) {
        return res.redirect('/customer/profile');
    }
    res.render('customer/login');
};

// @desc    Get Profile Page
// @route   GET /customer/profile
// @access  Private
exports.getProfile = async (req, res) => {
    try {
        const Order = getOrderModel();
        let orders = [];
        if (Order) {
            orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
        }
        res.render('customer/profile', { user: req.user, orders });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    Update Profile Details
// @route   POST /customer/profile/update
// @access  Private
exports.updateProfile = async (req, res) => {
    try {
        const { username, email, firstName, lastName } = req.body;
        await User.findByIdAndUpdate(req.user._id, { username, email, firstName, lastName });
        res.redirect('/customer/profile?updated=profile');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    Update Shipping Address
// @route   POST /customer/profile/address
// @access  Private
exports.updateAddress = async (req, res) => {
    try {
        const { street, city, state, zip } = req.body;
        await User.findByIdAndUpdate(req.user._id, {
            address: { street, city, state, zip }
        });
        res.redirect('/customer/profile?updated=address');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};
