const mongoose = require('mongoose');

const PageSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    content: {
        type: String, // HTML content fallback
        required: false
    },
    blocks: {
        type: Array, // Structured JSON for Page Builder
        default: []
    },
    template: {
        type: String,
        default: 'default' // 'default', 'full-width', 'contact', etc.
    },
    status: {
        type: String,
        enum: ['published', 'draft'],
        default: 'draft'
    },
    featuredImage: String,
    showTitle: {
        type: Boolean,
        default: true
    },
    showFeaturedImage: {
        type: Boolean,
        default: true
    },
    metaTitle: String,
    metaDescription: String,
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

PageSchema.pre('save', async function () {
    this.updatedAt = Date.now();
});

module.exports = mongoose.model('Page', PageSchema);
