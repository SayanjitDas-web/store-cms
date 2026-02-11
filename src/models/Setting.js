const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    value: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    isSecret: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Setting', SettingSchema);
