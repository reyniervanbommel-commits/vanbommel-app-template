import { tokens } from '@fluentui/react-components';

export function statusToken(color) {
  switch (color) {
    case 'green':
      return tokens.colorPaletteGreenBackground2;
    case 'orange':
      return tokens.colorPaletteDarkOrangeBackground2;
    case 'red':
      return tokens.colorPaletteRedBackground2;
    default:
      return tokens.colorNeutralBackground4;
  }
}

export function formatWeekLabel(year, week) {
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function currentIsoWindow(size = 8) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const week = Math.max(1, Math.min(53, getIsoWeekNumber(now)));
  const fromWeek = Math.max(1, week - Math.floor(size / 2));
  return {
    fromYear: year,
    fromWeek,
    toYear: year,
    toWeek: Math.min(53, fromWeek + size - 1),
  };
}

function getIsoWeekNumber(date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const yearStartDay = yearStart.getUTCDay() || 7;
  yearStart.setUTCDate(yearStart.getUTCDate() + 4 - yearStartDay);
  return 1 + Math.round((target - yearStart) / (7 * 24 * 60 * 60 * 1000));
}

export function buildAnalysisQuery(window, vendorAccount) {
  const params = new URLSearchParams({
    fromYear: String(window.fromYear),
    fromWeek: String(window.fromWeek),
    toYear: String(window.toYear),
    toWeek: String(window.toWeek),
  });
  if (vendorAccount) params.set('vendorAccount', vendorAccount);
  return `/rccp/analysis?${params.toString()}`;
}
