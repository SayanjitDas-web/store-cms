const express = require('express');
const router = express.Router();
const { renderPage } = require('../controllers/frontendController');

// Catch-all for dynamic pages
// Catch-all for dynamic pages
router.get(/.*/, renderPage);

module.exports = router;
