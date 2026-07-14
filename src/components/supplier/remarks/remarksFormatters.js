export const REACTION_EMOJIS = ['👍', '😊', '🎉', '❤️', '😂', '😮'];

export function rowKey(partitionKey, recordKey) {
  return `${partitionKey ?? ''}\u0000${recordKey ?? ''}`;
}

export function formatDateTime(value) {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatDayLabel(value, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const item = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDifference = Math.round((current.getTime() - item.getTime()) / 86400000);
  if (dayDifference === 0) return 'Today';
  if (dayDifference === 1) return 'Yesterday';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(date);
}

export function getActivityTimestamp(item) {
  return item?.createdAt || item?.at || item?.changedAt || null;
}

export function isRemarkActivity(item) {
  return item?.kind === 'remark' || item?.type === 'remark' || Boolean(item?.remark);
}

export function toRemark(item) {
  return item?.remark || item;
}

export function mergeNewest(current, incoming) {
  const seen = new Set();
  return [...incoming, ...current].filter((item) => {
    const key = `${item?.type || item?.kind || 'remark'}:${item?.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mergeOlder(current, incoming) {
  const seen = new Set(current.map((item) => `${item?.type || item?.kind || 'remark'}:${item?.id}`));
  return [
    ...current,
    ...incoming.filter((item) => {
      const key = `${item?.type || item?.kind || 'remark'}:${item?.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  ];
}
