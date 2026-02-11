const Page = require('../models/Page');

// Helper to parse boolean from form (handles hidden input fallback array)
const parseBoolean = (value) => {
    if (Array.isArray(value)) {
        return value.includes('true');
    }
    return value === 'true' || value === true;
};

// @desc    Get all pages (Admin)
// @route   GET /admin/pages
// @access  Private/Admin
exports.getPages = async (req, res) => {
    try {
        const pages = await Page.find().sort({ createdAt: -1 });
        res.render('admin/pages/index', { pages });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Get create page view
// @route   GET /admin/pages/create
// @access  Private/Admin
exports.createPageForm = (req, res) => {
    res.render('admin/pages/create');
};

const { saveMedia } = require('../utils/mediaManager');

// @desc    Create new page
// @route   POST /admin/pages
// @access  Private/Admin
exports.createPage = async (req, res) => {
    try {
        req.body.author = req.user.id;

        // Handle Image: File Upload > Media Library Selection > None
        if (req.file) {
            const mediaUrl = await saveMedia(req.file);
            req.body.featuredImage = mediaUrl;
        }
        // If no file uploaded, req.body.featuredImage might already be set from Media Picker hidden input
        // No extra logic needed, just passing req.body to create() handles it.

        // Explicitly handle boolean settings (checkboxes don't send values when unchecked)
        req.body.showTitle = parseBoolean(req.body.showTitle);
        req.body.showFeaturedImage = parseBoolean(req.body.showFeaturedImage);

        const page = await Page.create(req.body);

        if (req.body.launchBuilder === 'true') {
            return res.redirect(`/admin/page-builder/${page._id}`);
        }

        res.redirect('/admin/pages');
    } catch (err) {
        console.error(err);
        res.render('admin/pages/create', {
            error: err.message,
            input: req.body
        });
    }
};

// @desc    Get edit page view
// @route   GET /admin/pages/edit/:id
// @access  Private/Admin
exports.editPageForm = async (req, res) => {
    try {
        const page = await Page.findById(req.params.id);
        if (!page) {
            return res.status(404).send('Page not found');
        }
        res.render('admin/pages/edit', { page });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Update page
// @route   POST /admin/pages/edit/:id
// @access  Private/Admin
exports.updatePage = async (req, res) => {
    try {
        let page = await Page.findById(req.params.id);
        if (!page) {
            return res.status(404).send('Page not found');
        }

        if (req.file) {
            const mediaUrl = await saveMedia(req.file);
            req.body.featuredImage = mediaUrl;
        } else if (!req.body.featuredImage) {
            // If explicit empty string or undefined, keep existing? 
            // The hidden input sends the existing value if not changed.
            // If cleared, it sends empty.
            // If the user wants to clear the image, they'd send empty string.
            // However, typical HTML forms might not send unchecked/disabled inputs, but hidden inputs are sent.
            // Let's assume if it is NOT in body, we might want to keep old?
            // Actually, `findByIdAndUpdate` updates fields present in `req.body`.
            // If `featuredImage` is in `req.body` (even empty), it updates. 
            // If we want to PRESERVE existing if not provided:
            if (req.body.featuredImage === undefined) {
                // But wait, the form has a hidden input named 'featuredImage'. It will be sent.
            }
        }

        // Explicitly handle boolean settings (checkboxes don't send values when unchecked)
        req.body.showTitle = parseBoolean(req.body.showTitle);
        req.body.showFeaturedImage = parseBoolean(req.body.showFeaturedImage);

        page = await Page.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.redirect('/admin/pages');
    } catch (err) {
        console.error(err);
        res.render('admin/pages/edit', {
            error: err.message,
            page: { ...req.body, _id: req.params.id }
        });
    }
};

// @desc    Delete page
// @route   POST /admin/pages/delete/:id
// @access  Private/Admin
exports.deletePage = async (req, res) => {
    try {
        await Page.findByIdAndDelete(req.params.id);
        res.redirect('/admin/pages');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
