const express = require('express');
const router = express.Router();
const { getSignup, getLogin, getProfile, updateProfile, updateAddress } = require('../controllers/customerController');
const { protect } = require('../middlewares/authMiddleware');

// User is now loaded globally in app.js

router.get('/signup', getSignup);
router.get('/login', getLogin);
router.get('/profile', protect, getProfile);
router.post('/profile/update', protect, updateProfile);
router.post('/profile/address', protect, updateAddress);

module.exports = router;
