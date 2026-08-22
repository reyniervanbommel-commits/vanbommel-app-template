/** Hex-kleuren met optionele alpha (#RRGGBB of #RRGGBBAA). */

export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

const DARK_TEXT = '#323130';
const LIGHT_TEXT = '#ffffff';
const BLEND_BACKGROUND = 255;

export function isHexColor(value) {
  return HEX_COLOR_PATTERN.test(String(value || ''));
}

export function normalizeHexColor(value) {
  return isHexColor(value) ? String(value).toLowerCase() : '';
}

export function getRgbHex(value) {
  const color = normalizeHexColor(value);
  return color ? color.slice(0, 7) : '';
}

export function getOpacityPercent(value) {
  const color = normalizeHexColor(value);
  if (!color) return 100;
  if (color.length === 7) return 100;
  const alpha = Number.parseInt(color.slice(7, 9), 16);
  return Math.round((alpha / 255) * 100);
}

export function applyOpacity(hex, percent) {
  const rgb = getRgbHex(hex);
  if (!rgb) return '';
  const clamped = Math.min(100, Math.max(0, Math.round(Number(percent))));
  if (clamped >= 100) return rgb;
  const alpha = Math.round((clamped / 100) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${rgb}${alpha}`;
}

function parseRgb(hex) {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function toHexByte(value) {
  return Math.min(255, Math.max(0, value)).toString(16).padStart(2, '0');
}

export function blendHexToOpaque(foreground, background = '#ffffff') {
  const color = normalizeHexColor(foreground);
  if (!color) return '';
  if (color.length === 7) return color;
  const backdrop = getRgbHex(background) || '#ffffff';
  const [red, green, blue] = parseRgb(color);
  const [backRed, backGreen, backBlue] = parseRgb(backdrop);
  const alpha = Number.parseInt(color.slice(7, 9), 16) / 255;
  const blend = (channel, back) => Math.round(channel * alpha + back * (1 - alpha));
  return `#${toHexByte(blend(red, backRed))}${toHexByte(blend(green, backGreen))}${toHexByte(blend(blue, backBlue))}`;
}

export function getContrastTextColor(backgroundColor) {
  const color = normalizeHexColor(backgroundColor);
  if (!color) return LIGHT_TEXT;
  const [red, green, blue] = parseRgb(color);
  const alpha = color.length === 9 ? Number.parseInt(color.slice(7, 9), 16) / 255 : 1;
  const blend = (channel) => Math.round(channel * alpha + BLEND_BACKGROUND * (1 - alpha));
  const luminance = (0.299 * blend(red) + 0.587 * blend(green) + 0.114 * blend(blue)) / 255;
  return luminance > 0.55 ? DARK_TEXT : LIGHT_TEXT;
}
