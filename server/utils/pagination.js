'use strict';

function parsePaginationParams(query) {
  let page = parseInt(query.page) || 1;
  let pageSize = parseInt(query.pageSize) || 25;
  if (page < 1) page = 1;
  if (pageSize < 1) pageSize = 1;
  if (pageSize > 100) pageSize = 100;
  return { page, pageSize };
}

function buildPaginationMeta(total, page, pageSize) {
  return {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

module.exports = { parsePaginationParams, buildPaginationMeta };
