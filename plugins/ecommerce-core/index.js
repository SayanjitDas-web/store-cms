const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const { upload, saveMedia } = require('../../src/utils/mediaManager');

// Define Product Model Schema
const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: String,
    stock: { type: Number, default: 0 },
    image: String,
    createdAt: { type: Date, default: Date.now }
});

let Product;
try {
    Product = mongoose.model('Product');
} catch {
    Product = mongoose.model('Product', ProductSchema);
}

// Define Order Model Schema
const OrderSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // Legacy, removing reference as array is better
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        price: Number,
        quantity: Number
    }],
    quantity: { type: Number, default: 1 }, // Legacy
    status: { type: String, default: 'pending' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerInfo: {
        firstName: String,
        lastName: String,
        email: String,
        address: String
    },
    totalAmount: Number,
    createdAt: { type: Date, default: Date.now }
});

let Order;
try {
    Order = mongoose.model('Order');
} catch {
    Order = mongoose.model('Order', OrderSchema);
}

module.exports = {
    init: async (app, HookSystem, MediaAPI, { protect, adminMenuMiddleware }) => {
        console.log('Ecommerce Core Plugin Initialized');

        // Register Views
        const viewsPath = path.join(__dirname, 'views');
        const existingViews = app.get('views');
        if (Array.isArray(existingViews)) {
            if (!existingViews.includes(viewsPath)) {
                app.set('views', [...existingViews, viewsPath]);
            }
        } else {
            app.set('views', [existingViews, viewsPath]);
        }

        // Admin Routes
        const adminRouter = express.Router();

        // Secure and Menu Context for Plugin Admin Routes
        if (protect) adminRouter.use(protect);
        if (adminMenuMiddleware) adminRouter.use(adminMenuMiddleware);

        // --- Frontend Routes ---
        app.get('/shop', async (req, res) => {
            try {
                const products = await Product.find().sort({ createdAt: -1 });
                res.render('frontend/shop', { products });
            } catch (err) {
                res.status(500).send(err.message);
            }
        });

        app.get('/shop/product/:id', async (req, res) => {
            try {
                const product = await Product.findById(req.params.id);
                if (!product) return res.status(404).send('Product not found');
                res.render('frontend/product', { product });
            } catch (err) {
                res.status(500).send(err.message);
            }
        });

        // Cart Routes
        app.get('/cart', (req, res) => {
            if (!req.session.cart) {
                req.session.cart = { items: [], total: 0 };
            }
            res.render('frontend/cart', { cart: req.session.cart });
        });

        app.post('/cart/add', async (req, res) => {
            const { productId, quantity } = req.body;
            const qty = parseInt(quantity) || 1;

            if (!req.session.cart) {
                req.session.cart = { items: [], total: 0 };
            }

            const product = await Product.findById(productId);
            if (!product) return res.status(404).send('Product not found');

            const existingItem = req.session.cart.items.find(item => item.productId === productId);

            if (existingItem) {
                existingItem.quantity += qty;
            } else {
                req.session.cart.items.push({
                    productId: product._id.toString(),
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    quantity: qty
                });
            }

            // Recalculate Total
            req.session.cart.total = req.session.cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            req.session.save(err => {
                if (err) console.error('Session Save Error:', err);
                res.redirect('/cart');
            });
        });

        app.post('/cart/update', (req, res) => {
            const { productId, quantity } = req.body;
            const qty = parseInt(quantity);

            if (req.session.cart) {
                const item = req.session.cart.items.find(i => i.productId === productId);
                if (item && qty > 0) {
                    item.quantity = qty;
                    req.session.cart.total = req.session.cart.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
                }
            }
            req.session.save(err => {
                if (err) console.error(err);
                res.redirect('/cart');
            });
        });

        app.post('/cart/remove', (req, res) => {
            const { productId } = req.body;
            if (req.session.cart) {
                req.session.cart.items = req.session.cart.items.filter(item => item.productId !== productId);
                req.session.cart.total = req.session.cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            }
            req.session.save(err => {
                if (err) console.error(err);
                res.redirect('/cart');
            });
        });

        // Checkout Routes
        app.get('/checkout', protect, (req, res) => {
            if (!req.session.cart || req.session.cart.items.length === 0) {
                return res.redirect('/cart');
            }
            res.render('frontend/checkout');
        });

        app.post('/checkout', protect, async (req, res) => {
            if (!req.session.cart || req.session.cart.items.length === 0) {
                return res.redirect('/cart');
            }

            try {
                const { firstName, lastName, email, address, paymentMethod } = req.body;

                // Create Order
                const order = await Order.create({
                    user: req.user._id,
                    customerInfo: {
                        firstName,
                        lastName,
                        email,
                        address
                    },
                    totalAmount: req.session.cart.total,
                    status: 'pending',
                    items: req.session.cart.items
                });

                // Clear Cart
                req.session.cart = { items: [], total: 0 };

                // Redirect to Success
                res.redirect(`/shop/order/success/${order._id}`);
            } catch (err) {
                console.error(err);
                res.status(500).send('Error processing order');
            }
        });

        app.get('/shop/order/success/:id', async (req, res) => {
            try {
                const order = await Order.findById(req.params.id);
                if (!order) return res.status(404).send('Order not found');
                res.render('frontend/success', { order });
            } catch (err) {
                res.status(500).send(err.message);
            }
        });

        // --- Products (Admin) ---

        // List Products
        adminRouter.get('/products', async (req, res) => {
            try {
                const products = await Product.find().sort({ createdAt: -1 });
                res.render('products/index', { products });
            } catch (err) {
                res.status(500).send(err.message);
            }
        });

        // Create View
        adminRouter.get('/products/create', (req, res) => {
            res.render('products/create');
        });

        // Create Action
        adminRouter.post('/products', upload, async (req, res) => {
            try {
                const { name, price, description, media_url } = req.body;
                let image = media_url || '';

                if (req.file) {
                    image = await saveMedia(req.file);
                }

                await Product.create({
                    name,
                    price,
                    description,
                    image
                });

                res.redirect('/admin/ecommerce/products');
            } catch (err) {
                console.error(err);
                res.status(500).send('Error creating product');
            }
        });

        // Edit View
        adminRouter.get('/products/edit/:id', async (req, res) => {
            try {
                const product = await Product.findById(req.params.id);
                if (!product) return res.status(404).send('Product not found');
                res.render('products/edit', { product });
            } catch (err) {
                res.status(500).send(err.message);
            }
        });

        // Edit Action
        adminRouter.post('/products/edit/:id', upload, async (req, res) => {
            try {
                const { name, price, description, media_url } = req.body;
                const updateData = { name, price, description };

                if (req.file) {
                    updateData.image = await saveMedia(req.file);
                } else if (media_url) {
                    updateData.image = media_url;
                }

                await Product.findByIdAndUpdate(req.params.id, updateData);
                res.redirect('/admin/ecommerce/products');
            } catch (err) {
                console.error(err);
                res.status(500).send('Error updating product');
            }
        });

        // --- Orders ---

        // List Orders
        adminRouter.get('/orders', async (req, res) => {
            try {
                const orders = await Order.find().populate('product').populate('user').sort({ createdAt: -1 });
                res.render('orders/index', { orders });
            } catch (err) {
                res.status(500).send(err.message);
            }
        });

        // View Order
        adminRouter.get('/orders/:id', async (req, res) => {
            try {
                const order = await Order.findById(req.params.id).populate('user');
                if (!order) return res.status(404).send('Order not found');
                res.render('orders/view', { order });
            } catch (err) {
                res.status(500).send(err.message);
            }
        });

        // Update Order Status
        adminRouter.post('/orders/:id/status', async (req, res) => {
            try {
                const { status } = req.body;
                await Order.findByIdAndUpdate(req.params.id, { status });
                res.redirect(`/admin/ecommerce/orders/${req.params.id}`);
            } catch (err) {
                console.error(err);
                res.status(500).send('Error updating order status');
            }
        });

        // Delete Product
        adminRouter.post('/products/delete/:id', async (req, res) => {
            try {
                await Product.findByIdAndDelete(req.params.id);
                res.redirect('/admin/ecommerce/products');
            } catch (err) {
                console.error(err);
                res.status(500).send('Error deleting product');
            }
        });

        // Add to Admin Router (We need to access the main admin router or mount this)
        // Since we don't have direct access to internal routers, we mount on app
        app.use('/admin/ecommerce', adminRouter);

        // Sidebar Hook
        HookSystem.addFilter('admin_sidebar_menu', (menu) => {
            menu.push({
                title: 'Products',
                link: '/admin/ecommerce/products',
                icon: 'bi-box-seam'
            });
            menu.push({
                title: 'Orders',
                link: '/admin/ecommerce/orders',
                icon: 'bi-receipt'
            });
            return menu;
        });

        // Content Hook for Shortcodes
        HookSystem.addFilter('page_content', async (content) => {
            const productShortcodeRegex = /\[products(?:\s+limit="(\d+)")?\]/g;

            // Find all matches first to avoid async issues in replacement
            const matches = [...content.matchAll(productShortcodeRegex)];

            for (const match of matches) {
                const limit = parseInt(match[1]) || 12;
                let productHtml = '';

                try {
                    const products = await Product.find().limit(limit).sort({ createdAt: -1 });

                    if (products.length > 0) {
                        productHtml = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-8">';
                        products.forEach(p => {
                            const description = p.description ? p.description.replace(/<[^>]*>/g, '').substring(0, 100) : '';
                            productHtml += `
                                <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 border border-gray-100 flex flex-col h-full">
                                    <a href="/shop/product/${p._id}" class="block">
                                        <div class="h-48 overflow-hidden bg-gray-100 flex items-center justify-center">
                                            ${p.image
                                    ? `<img src="${p.image}" alt="${p.name}" class="w-full h-full object-cover">`
                                    : `<i class="bi bi-image text-4xl text-gray-300"></i>`
                                }
                                        </div>
                                    </a>
                                    <div class="p-4 flex-1 flex flex-col">
                                        <h3 class="font-semibold text-lg mb-1 text-gray-800 truncate">
                                            <a href="/shop/product/${p._id}" class="hover:text-indigo-600">${p.name}</a>
                                        </h3>
                                        <p class="text-indigo-600 font-bold mb-2">$${p.price.toFixed(2)}</p>
                                        <p class="text-gray-600 text-sm mb-4 line-clamp-2 flex-1">${description}...</p>
                                        
                                        <form action="/cart/add" method="POST" class="mt-auto">
                                            <input type="hidden" name="productId" value="${p._id}">
                                            <input type="hidden" name="quantity" value="1">
                                            <button type="submit" class="block w-full text-center bg-gray-900 text-white py-2 rounded-md hover:bg-gray-800 transition-colors">
                                                Add to Cart
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            `;
                        });
                        productHtml += '</div>';
                    } else {
                        productHtml = '<p class="text-center text-gray-500 italic my-4">No products found.</p>';
                    }
                } catch (err) {
                    console.error('Error fetching products for shortcode:', err);
                    productHtml = '<p class="text-red-500">Error loading products.</p>';
                }

                content = content.replace(match[0], productHtml);
            }

            return content;
        });
    }
};
