const express = require('express');
const path = require('path');
const Page = require('../../src/models/Page');

module.exports = {
    name: 'page-builder',
    version: '1.0.0',
    description: 'A robust block-based Page Builder for StoreCMS.',

    async init(app, HookSystem, MediaAPI, options, PluginManager) {
        const { protect, adminMenuMiddleware } = options;
        const adminRouter = express.Router();
        const { authorize } = require('../../src/middlewares/authMiddleware');

        // Middleware for admin access & Plugin Status Check
        adminRouter.use(protect);
        adminRouter.use(authorize('admin'));
        adminRouter.use((req, res, next) => {
            if (!PluginManager.isPluginActive('page-builder')) {
                return res.status(403).send('Plugin is disabled');
            }
            next();
        });

        // Admin Routes
        adminRouter.get('/:id', async (req, res) => {
            try {
                const page = await Page.findById(req.params.id);
                if (!page) return res.status(404).send('Page not found');

                const pages = await Page.find({}, 'title slug').lean();

                // Set plugin view path
                const originalViews = app.get('views');
                app.set('views', [
                    path.join(__dirname, 'views'),
                    ...(Array.isArray(originalViews) ? originalViews : [originalViews])
                ]);

                const builderScripts = await HookSystem.applyFilter('builder_scripts', '');
                res.render('builder', { page, pages, builderScripts });

                // Restore original views after render
                app.set('views', originalViews);

            } catch (err) {
                console.error(err);
                res.status(500).send('Error loading page builder');
            }
        });

        // API: Save Blocks
        adminRouter.post('/api/save/:id', async (req, res) => {
            try {
                const { blocks, content } = req.body;
                await Page.findByIdAndUpdate(req.params.id, {
                    blocks,
                    content
                });
                res.json({ success: true, message: 'Page saved successfully' });
            } catch (err) {
                console.error(err);
                res.status(500).json({ success: false, message: err.message });
            }
        });

        app.use('/admin/page-builder', adminRouter);

        // Serve static files
        app.use('/page-builder-assets', express.static(path.join(__dirname, 'public')));

        // Block Renderer (Server-side)
        const renderBlocks = async (blocks) => {
            if (!blocks || !Array.isArray(blocks) || blocks.length === 0) return null;

            const mongoose = require('mongoose');
            let Product;
            try { Product = mongoose.model('Product'); } catch (e) { }

            // Registry of Block Renderers
            let registry = {
                hero: (data) => {
                    const align = data.align || 'center';
                    const alignClass = align === 'center' ? 'mx-auto' : (align === 'right' ? 'ml-auto' : '');
                    const textAlign = `text-${align}`;
                    const textColor = data.textColor || 'white';
                    const opacityValue = (data.opacity !== undefined ? data.opacity : 40);
                    const opacity = opacityValue / 100;

                    return `
                        <section class="relative bg-gray-900 text-${textColor} py-24 px-12 overflow-hidden">
                            <div class="absolute inset-0" style="opacity: ${opacity}">
                                <img src="${data.image}" class="w-full h-full object-cover">
                            </div>
                            <div class="relative z-10 max-w-2xl ${alignClass} ${textAlign}">
                                <h1 class="text-5xl font-extrabold mb-6">${data.title}</h1>
                                <p class="text-xl mb-8 opacity-90 font-light">${data.subtitle}</p>
                                <a href="${data.buttonUrl || '#'}" class="inline-block bg-indigo-600 px-8 py-3 rounded-full font-bold hover:bg-indigo-700 transition-colors">${data.buttonText}</a>
                            </div>
                        </section>
                    `;
                },

                text: (data) => `
                    <div class="py-12 px-12 bg-white">
                        <div class="prose max-w-none">${data.content}</div>
                    </div>
                `,
                image: (data) => `
                    <div class="py-12 px-12 bg-gray-50 flex flex-col items-center">
                        <img src="${data.url}" class="rounded-xl shadow-lg max-w-full h-auto mb-4">
                        <p class="text-gray-500 text-sm italic">${data.caption}</p>
                    </div>
                `,
                'feature-list': (data) => {
                    const items = data.features.split(',').map(f => `
                        <div class="flex items-center space-x-3">
                            <div class="flex-shrink-0 w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                <i class="bi bi-check text-xs"></i>
                            </div>
                            <span class="text-gray-700">${f.trim()}</span>
                        </div>
                    `).join('');
                    return `
                        <div class="py-12 px-12 bg-white">
                            <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">${items}</div>
                        </div>
                    `;
                },
                'product-grid': async (data) => {
                    if (!Product) return '<div class="p-8 text-center bg-gray-100 rounded">Products plugin not active</div>';

                    const products = await Product.find().sort({ createdAt: -1 }).limit(parseInt(data.limit) || 4);

                    const cards = products.map(p => `
                        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                            <div class="aspect-square overflow-hidden relative">
                                <img src="${p.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=400'}" 
                                     class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                                <div class="absolute inset-x-0 bottom-0 p-4 lg:translate-y-full lg:group-hover:translate-y-0 transition-transform duration-300">
                                    <a href="/shop/product/${p._id}" class="block w-full bg-white text-gray-900 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-gray-50 transition-all text-center border border-gray-100 lg:border-none">
                                        View Details
                                    </a>
                                </div>
                            </div>
                            <div class="p-4 flex flex-col flex-grow">
                                <h3 class="font-bold text-gray-900 mb-1 line-clamp-1">${p.name}</h3>
                                <p class="text-indigo-600 font-extrabold text-lg mt-auto">$${p.price.toFixed(2)}</p>
                            </div>
                        </div>
                    `).join('');

                    return `
                        <div class="py-16 px-12 bg-gray-50">
                            <div class="container mx-auto">
                                <h2 class="text-3xl font-extrabold text-gray-900 mb-10 text-center">${data.title}</h2>
                                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                                    ${cards}
                                </div>
                            </div>
                        </div>
                    `;
                }
            };

            // Allow other plugins to extend the block registry
            registry = await HookSystem.applyFilter('page_builder_blocks', registry);

            const htmlChunks = await Promise.all(blocks.map(async (b) => {
                const renderer = registry[b.type];
                if (!renderer) return '';
                return typeof renderer === 'function' ? await renderer(b.data) : '';
            }));

            return htmlChunks.join('');
        };


        // Register Filter
        HookSystem.addFilter('page_content', async (content, page) => {
            // if (!PluginManager.isPluginActive('page-builder')) return content; // Allow rendering even if deactivated (for session persistence)

            if (page.blocks && page.blocks.length > 0) {
                const blockHtml = await renderBlocks(page.blocks);
                return blockHtml || content;
            }
            return content;
        });
    }
};
