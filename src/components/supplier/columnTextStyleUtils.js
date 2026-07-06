function buildTextStyle(textStyle) {
  const textColor = String(textStyle?.textColor || '').trim();
  const bold = textStyle?.bold === true;
  const italic = textStyle?.italic === true;
  const underline = textStyle?.underline === true;
  const hasTextStyle = Boolean(textColor || bold || italic || underline);
  if (!hasTextStyle) return undefined;
  return {
    ...(textColor ? { color: textColor } : {}),
    ...(bold ? { fontWeight: 700 } : {}),
    ...(italic ? { fontStyle: 'italic' } : {}),
    ...(underline ? { textDecorationLine: 'underline' } : {}),
  };
}

export function getColumnCellStyle(columnWidths, columnTextStyles, columnKey, backgroundColor = '') {
  const width = Number(columnWidths?.[columnKey]);
  const resolvedTextStyle = buildTextStyle(columnTextStyles?.[columnKey]);
  const resolvedBackgroundColor = /^#[0-9a-fA-F]{6}$/.test(String(backgroundColor || ''))
    ? String(backgroundColor).toLowerCase()
    : '';
  const hasWidth = Number.isFinite(width);
  if (!hasWidth && !resolvedTextStyle && !resolvedBackgroundColor) return undefined;
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
  };
}
