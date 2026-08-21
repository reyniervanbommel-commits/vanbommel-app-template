import { HEX_COLOR_PATTERN, getContrastTextColor, getOpacityPercent, normalizeHexColor } from '../../utils/hexColor';

export const FORMATTED_CELL_TEXT_COLOR = '#ffffff';

export function getFormattedTextColor(backgroundColor) {
  const color = normalizeHexColor(backgroundColor);
  if (!color || getOpacityPercent(color) >= 100) return FORMATTED_CELL_TEXT_COLOR;
  return getContrastTextColor(color);
}

export function getFormattedCellTextCssVars(backgroundColor) {
  const textColor = getFormattedTextColor(backgroundColor);
  return {
    color: textColor,
    '--colorNeutralForeground1': textColor,
    '--colorNeutralForeground2': textColor,
    '--colorNeutralForeground3': textColor,
    '--colorBrandForeground1': textColor,
    '--colorBrandForeground2': textColor,
    '--colorCompoundBrandForeground1': textColor,
  };
}

export const FORMATTED_CELL_CSS_VARS = Object.freeze(getFormattedCellTextCssVars(''));

function buildTextStyle(textStyle, { omitColor = false } = {}) {
  const textColor = String(textStyle?.textColor || '').trim();
  const bold = textStyle?.bold === true;
  const italic = textStyle?.italic === true;
  const underline = textStyle?.underline === true;
  const hasTextStyle = Boolean((!omitColor && textColor) || bold || italic || underline);
  if (!hasTextStyle) return undefined;
  return {
    ...(!omitColor && textColor ? { color: textColor } : {}),
    ...(bold ? { fontWeight: 700 } : {}),
    ...(italic ? { fontStyle: 'italic' } : {}),
    ...(underline ? { textDecorationLine: 'underline' } : {}),
  };
}

export function getFormattedCellContentStyle(isConditionalFormat, backgroundColor = '') {
  return isConditionalFormat ? getFormattedCellTextCssVars(backgroundColor) : undefined;
}

export function getColumnCellStyle(columnWidths, columnTextStyles, columnKey, backgroundColor = '', options = {}) {
  const { useFormattedTextColor = false } = options;
  const width = Number(columnWidths?.[columnKey]);
  const resolvedTextStyle = buildTextStyle(columnTextStyles?.[columnKey], {
    omitColor: useFormattedTextColor,
  });
  const resolvedBackgroundColor = HEX_COLOR_PATTERN.test(String(backgroundColor || ''))
    ? String(backgroundColor).toLowerCase()
    : '';
  const hasWidth = Number.isFinite(width);
  if (!hasWidth && !resolvedTextStyle && !resolvedBackgroundColor && !useFormattedTextColor) return undefined;
  return {
    ...(hasWidth
      ? {
        width: `${Math.round(width)}px`,
        minWidth: `${Math.round(width)}px`,
        maxWidth: `${Math.round(width)}px`,
      }
      : {}),
    ...(resolvedBackgroundColor ? { backgroundColor: resolvedBackgroundColor } : {}),
    ...(resolvedTextStyle || {}),
    ...(useFormattedTextColor ? getFormattedCellTextCssVars(resolvedBackgroundColor) : {}),
  };
}

export function getRowFormatControlCellStyle(rowFormatColor) {
  const color = HEX_COLOR_PATTERN.test(String(rowFormatColor || ''))
    ? String(rowFormatColor).toLowerCase()
    : '';
  if (!color) return undefined;
  return {
    backgroundColor: color,
    ...getFormattedCellTextCssVars(color),
  };
}

/** Aligns inline edit controls with conditional formatting on the parent cell. */
export function getFormattedCellControlStyle(cellBackgroundColor, options = {}) {
  const { useWhiteText = true } = options;
  const color = HEX_COLOR_PATTERN.test(String(cellBackgroundColor || ''))
    ? String(cellBackgroundColor).toLowerCase()
    : '';
  if (!color) return undefined;
  return {
    backgroundColor: color,
    ...(useWhiteText ? getFormattedCellTextCssVars(color) : {}),
    '--colorNeutralBackground1': color,
    '--colorNeutralBackground2': color,
  };
}
