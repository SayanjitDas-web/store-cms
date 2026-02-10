const { listMedia, deleteMedia, saveMedia } = require('../utils/mediaManager');

exports.index = async (req, res) => {
    res.render('admin/media/index');
};

exports.apiList = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const skip = parseInt(req.query.skip) || 0;
        const files = await listMedia(limit, skip);
        res.json({ files });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.apiUpload = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const url = await saveMedia(req.file);
        res.json({ url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.apiDelete = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'ID required' });
        await deleteMedia(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
