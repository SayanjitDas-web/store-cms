const xss = require('xss');

const sanitize = (obj) => {
    if (obj instanceof Object) {
        for (const key in obj) {
            if (/^\$/.test(key)) {
                delete obj[key];
            } else {
                sanitize(obj[key]);
            }
        }
    }
    return obj;
};

const clean = (obj) => {
    if (obj instanceof Object) {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                obj[key] = xss(obj[key]);
            } else {
                clean(obj[key]);
            }
        }
    }
    return obj;
};

exports.mongoSanitize = () => {
    return (req, res, next) => {
        if (req.body) sanitize(req.body);
        if (req.params) sanitize(req.params);

        // Handle req.query specially for Express 5 compatibility (In-place mutation)
        if (req.query) {
            for (const key in req.query) {
                if (/^\$/.test(key)) {
                    delete req.query[key];
                } else {
                    // Start Deep Clean for query params if they are objects
                    sanitize(req.query[key]);
                }
            }
        }

        next();
    };
};

exports.xssSanitize = () => {
    return (req, res, next) => {
        if (req.body) clean(req.body);
        if (req.params) clean(req.params);
        if (req.query) {
            for (const key in req.query) {
                if (typeof req.query[key] === 'string') {
                    // In-place mutation for Express 5
                    req.query[key] = xss(req.query[key]);
                } else {
                    clean(req.query[key]);
                }
            }
        }
        next();
    };
};
