'use strict';

/** Hex-kleuren met optionele alpha (#RRGGBB of #RRGGBBAA). */

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

function isHexColor(value) {
  return HEX_COLOR_PATTERN.test(String(value || ''));
}

function normalizeHexColor(value) {
  return isHexColor(value) ? String(value).toLowerCase() : '';
}

function getRgbHex(value) {
  const color = normalizeHexColor(value);
  return color ? color.slice(0, 7) : '';
}

module.exports = {
  HEX_COLOR_PATTERN,
  isHexColor,
  normalizeHexColor,
  getRgbHex,
};
