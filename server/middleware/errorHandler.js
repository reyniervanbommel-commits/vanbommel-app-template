'use strict';

function errorHandler(err, req, res, _next) {
  console.error('[ErrorHandler]', err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message,
  });
}

module.exports = errorHandler;
