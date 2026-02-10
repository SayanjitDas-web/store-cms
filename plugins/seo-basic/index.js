module.exports = {
    init: async (app, HookSystem) => {

        // Filter: Modify Page Content
        HookSystem.addFilter('page_content', (content, page) => {
            return content + `
            <div class="seo-footer mt-4 p-3 bg-light border-top">
                <small>SEO Plugin Active. Page: ${page.title}</small>
            </div>
            `;
        });

        console.log('SEO Basic Plugin Initialized');
    }
};
