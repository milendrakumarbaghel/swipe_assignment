const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    message: 'Resource not found',
    path: req.originalUrl,
  });
};

const errorHandler = (err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal server error',
    details: err.details || null,
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
