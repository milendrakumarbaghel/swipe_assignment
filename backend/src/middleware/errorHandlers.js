const notFoundHandler = (req, res, next) => {
    res.status(404).json({
        message: 'Resource not found',
        path: req.originalUrl,
    });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    let status = err.status || 500;
    let message = err.message || 'Internal server error';
    let details = err.details || null;

    if (err.name === 'MulterError') {
        status = 400;
        message = err.message || 'File upload failed';
    }

    if (err.array && typeof err.array === 'function') {
        status = 400;
        details = err.array();
    }

    // eslint-disable-next-line no-console
    console.error(err);

    res.status(status).json({
        message,
        details,
    });
};

module.exports = {
    notFoundHandler,
    errorHandler,
};
