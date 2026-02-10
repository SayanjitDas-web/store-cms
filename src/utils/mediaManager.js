const multer = require('multer');
const ImageKit = require('imagekit');
const path = require('path');
const fs = require('fs');

// Check if ImageKit is configured
const isImageKitConfigured = () => {
    return process.env.IMAGEKIT_PUBLIC_KEY &&
        process.env.IMAGEKIT_PRIVATE_KEY &&
        process.env.IMAGEKIT_URL_ENDPOINT;
};

let imagekit;
let storage;

if (isImageKitConfigured()) {
    console.log('Using ImageKit for media storage.');
    imagekit = new ImageKit({
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
    });
    // Memory storage for ImageKit upload
    storage = multer.memoryStorage();
} else {
    console.log('Using Local Disk for media storage.');
    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), 'src', 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    });
}

// Check File Type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// Init Upload Middleware
const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).single('image');

// Abstracted Save Media Function
const saveMedia = async (file) => {
    if (!file) return null;

    if (isImageKitConfigured()) {
        // Upload to ImageKit
        try {
            const response = await imagekit.upload({
                file: file.buffer,
                fileName: file.originalname,
                folder: '/storecms/'
            });
            return response.url;
        } catch (error) {
            console.error('ImageKit Upload Error details:', error);

            // Fallback to local storage
            try {
                const uploadDir = path.join(process.cwd(), 'src', 'public', 'uploads');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
                fs.writeFileSync(path.join(uploadDir, filename), file.buffer);
                console.log('Fallback: Saved to local disk instead of cloud.');
                return '/uploads/' + filename;
            } catch (localErr) {
                console.error('Local Fallback Error:', localErr);
                throw new Error('Failed to upload image (Cloud & Local failed).');
            }
        }
    } else {
        // Local File (Multer already saved it to disk if using diskStorage)
        // We just need to return the public URL
        // When using diskStorage, 'file' object has 'filename' property
        return '/uploads/' + file.filename;
    }
};

// Helper to list local files
const listLocalFiles = (limit, skip) => {
    const uploadDir = path.join(process.cwd(), 'src', 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) return [];

    return fs.readdirSync(uploadDir)
        .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
        .map(file => {
            const stats = fs.statSync(path.join(uploadDir, file));
            return {
                id: file, // filename as ID for local
                name: file,
                url: '/uploads/' + file,
                thumbnail: '/uploads/' + file,
                date: stats.ctime
            };
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(skip, skip + limit);
};

// List Media
const listMedia = async (limit = 20, skip = 0) => {
    let files = [];

    // Try ImageKit first if configured
    if (isImageKitConfigured()) {
        try {
            const ikFiles = await imagekit.listFiles({
                limit: limit,
                skip: skip,
                path: '/storecms/'
            });
            files = ikFiles.map(f => ({
                id: f.fileId,
                name: f.name,
                url: f.url,
                thumbnail: f.thumbnailUrl || f.url,
                date: f.createdAt
            }));
        } catch (error) {
            console.error('ImageKit List Error (Falling back to local):', error.message);
            // Fallback to local will happen below since files is empty or we can concatenate
        }
    }

    // If ImageKit failed or returned few results (optional logic), or just to show local files too:
    // For now, if ImageKit fails (files is empty), we show local. 
    // Or we could ALWAYS show local if we want a unified view? 
    // Let's stick to: If ImageKit Configured & Works => Show ImageKit.
    // If ImageKit Configured & Fails => Show Local.
    // If Not Configured => Show Local.

    if (files.length === 0) {
        files = listLocalFiles(limit, skip);
    }

    return files;
};

// Delete Media
const deleteMedia = async (fileId) => {
    if (isImageKitConfigured()) {
        try {
            await imagekit.deleteFile(fileId);
            return true;
        } catch (error) {
            console.error('ImageKit Delete Error:', error.message);
            // Try local delete as fallback (in case it was a local file with an ID that looks like ImageKit ID, or just a failover)
            // But wait, ImageKit IDs are different from local filenames.
            // If the ID matches a local file, delete it.
        }
    }

    // Local Delete Fallback
    const uploadDir = path.join(process.cwd(), 'src', 'public', 'uploads');
    const filePath = path.join(uploadDir, fileId);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
    }

    // If we reached here and isImageKitConfigured was true, it failed there and didn't find local.
    // If isImageKitConfigured was false, it just didn't find local.
    if (isImageKitConfigured()) {
        throw new Error('Failed to delete media (Cloud failed, Local not found).');
    } else {
        throw new Error('File not found locally.');
    }
};

const MediaAPI = {
    upload,
    saveMedia,
    listMedia,
    deleteMedia,
    isCloud: isImageKitConfigured
};

module.exports = MediaAPI;
