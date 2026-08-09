'use strict';

// Herbruikbare mock voor Express req/res/next, voor middleware-tests die
// geen echte Express-app/HTTP-server nodig hebben (in tegenstelling tot
// route-tests à la server/routes/media.test.js, die wel een echte app draaien).
function createMockReq(overrides = {}) {
  return {
    path: '/',
    method: 'GET',
    query: {},
    params: {},
    body: {},
    session: null,
    user: null,
    ...overrides,
  };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

function createMockNext() {
  const next = (...args) => {
    next.calls.push(args);
  };
  next.calls = [];
  return next;
}

module.exports = { createMockReq, createMockRes, createMockNext };
