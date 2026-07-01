'use strict';

function errorHandler(err, req, res, _next) {
  console.error('[ErrorHandler]', err.message);
  const status = err.status || err.statusCode || 500;
  const body = {
    error: process.env.NODE_ENV === 'production' ? 'Er is een fout opgetreden' : err.message,
  };
  // Machine-leesbare foutcode doorgeven zodat de frontend erop kan sturen (bv. 'AI_NOT_CONFIGURED').
  if (err.code && typeof err.code === 'string') body.code = err.code;
  res.status(status).json(body);
}

module.exports = errorHandler;
