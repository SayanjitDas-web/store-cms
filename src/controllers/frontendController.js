const Page = require('../models/Page');
const HookSystem = require('../core/HookSystem');

exports.renderPage = async (req, res, next) => {
    try {
        const slug = req.path === '/' ? 'home' : req.path.substring(1);
        const page = await Page.findOne({ slug, status: 'published' });

        if (!page) {
            return next(); // 404
        }

        // Apply filters to content
        page.content = await HookSystem.applyFilter('page_content', page.content, page);

        res.render(`themes/${page.template}`, { page });
    } catch (err) {
        console.error(err);
        next(err);
    }
};
