'use strict';

/**
 * ISO-8601 week helpers for RCCP (#AB:224).
 * Week 1 is the week with the first Thursday of the year; week 53 exists when applicable.
 */

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toDate(value) {
  if (value instanceof Date) return new Date(value.getTime());
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Thursday of the ISO week containing `date` (UTC). */
function isoWeekThursday(date) {
  const d = toDate(date);
  if (!d) return null;
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  return utc;
}

function getIsoWeekYear(date) {
  const thursday = isoWeekThursday(date);
  if (!thursday) return null;
  return thursday.getUTCFullYear();
}

function getIsoWeek(date) {
  const thursday = isoWeekThursday(date);
  if (!thursday) return null;
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const day = yearStart.getUTCDay() || 7;
  yearStart.setUTCDate(yearStart.getUTCDate() + 4 - day);
  const diff = thursday.getTime() - yearStart.getTime();
  return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
}

function isoWeekKey(year, week) {
  return `${year}-W${pad2(week)}`;
}

function parseIsoWeekKey(key) {
  const match = String(key || '').trim().match(/^(\d{4})-W(\d{1,2})$/);
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  const week = Number.parseInt(match[2], 10);
  if (!Number.isFinite(year) || !Number.isFinite(week) || week < 1 || week > 53) return null;
  return { year, week };
}

/** Monday 00:00 UTC of the given ISO week. */
function isoWeekStartUtc(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - day + 1);
  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return start;
}

function isIsoWeekInWindow(year, week, window) {
  if (!window) return false;
  const start = isoWeekStartUtc(window.fromYear, window.fromWeek).getTime();
  const end = isoWeekEndUtc(window.toYear, window.toWeek).getTime();
  const point = isoWeekStartUtc(year, week).getTime();
  return point >= start && point <= end;
}

function isoWeekEndUtc(year, week) {
  const start = isoWeekStartUtc(year, week);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

function weeksInIsoYear(year) {
  const dec28 = new Date(Date.UTC(year, 11, 28));
  return getIsoWeek(dec28);
}

function buildWeekRange(fromYear, fromWeek, toYear, toWeek) {
  const out = [];
  let y = fromYear;
  let w = fromWeek;
  const maxGuard = 120;
  for (let i = 0; i < maxGuard; i += 1) {
    out.push({ year: y, week: w, key: isoWeekKey(y, w) });
    if (y === toYear && w === toWeek) break;
    w += 1;
    const maxWeek = weeksInIsoYear(y);
    if (w > maxWeek) {
      w = 1;
      y += 1;
    }
  }
  return out;
}

module.exports = {
  getIsoWeek,
  getIsoWeekYear,
  isoWeekKey,
  parseIsoWeekKey,
  isoWeekStartUtc,
  isoWeekEndUtc,
  isIsoWeekInWindow,
  weeksInIsoYear,
  buildWeekRange,
};
