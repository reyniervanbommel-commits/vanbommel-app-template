import { apiRequest } from './api';

let inflight = null;
let cachedKey = '';
let cachedData = null;

export function getPoBoardKpis(refreshKey) {
  const key = String(refreshKey || '');
  if (cachedData && cachedKey === key) return Promise.resolve(cachedData);
  if (inflight && cachedKey === key) return inflight;
  cachedKey = key;
  inflight = apiRequest('/rccp/board-kpis')
    .then((data) => {
      cachedData = data;
      inflight = null;
      return data;
    })
    .catch((err) => {
      inflight = null;
      cachedKey = '';
      cachedData = null;
      throw err;
    });
  return inflight;
}

export function clearPoBoardKpiCache() {
  inflight = null;
  cachedKey = '';
  cachedData = null;
}
