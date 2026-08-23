const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseAlertEmails(raw) {
  return String(raw || '')
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function isValidAlertEmail(value) {
  return EMAIL_RE.test(String(value || '').trim());
}

export function mergeAlertEmails(existing, incoming) {
  const next = [];
  const seen = new Set();
  [...(existing || []), ...parseAlertEmails(incoming)].forEach((email) => {
    const key = String(email || '').trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    next.push(String(email).trim());
  });
  return next;
}
