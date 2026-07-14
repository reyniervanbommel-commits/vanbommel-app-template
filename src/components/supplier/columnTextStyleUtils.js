const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const FORMATTED_CELL_TEXT_COLOR = '#ffffff';

export const FORMATTED_CELL_CSS_VARS = Object.freeze({
  color: FORMATTED_CELL_TEXT_COLOR,
  '--colorNeutralForeground1': FORMATTED_CELL_TEXT_COLOR,
  '--colorNeutralForeground2': FORMATTED_CELL_TEXT_COLOR,
  '--colorNeutralForeground3': FORMATTED_CELL_TEXT_COLOR,
  '--colorBrandForeground1': FORMATTED_CELL_TEXT_COLOR,
  '--colorBrandForeground2': FORMATTED_CELL_TEXT_COLOR,
  '--colorCompoundBrandForeground1': FORMATTED_CELL_TEXT_COLOR,
});

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

export function getFormattedCellContentStyle(isConditionalFormat) {
  return isConditionalFormat ? { ...FORMATTED_CELL_CSS_VARS } : undefined;
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
    ...(useFormattedTextColor ? FORMATTED_CELL_CSS_VARS : {}),
  };
}

export function getRowFormatControlCellStyle(rowFormatColor) {
  const color = HEX_COLOR_PATTERN.test(String(rowFormatColor || ''))
    ? String(rowFormatColor).toLowerCase()
    : '';
  if (!color) return undefined;
  return {
    backgroundColor: color,
    ...FORMATTED_CELL_CSS_VARS,
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
    ...(useWhiteText ? FORMATTED_CELL_CSS_VARS : {}),
    '--colorNeutralBackground1': color,
    '--colorNeutralBackground2': color,
  };
}
