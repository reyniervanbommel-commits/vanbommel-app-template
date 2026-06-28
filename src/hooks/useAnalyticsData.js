import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../utils/api';

/**
 * useAnalyticsData — laadt en beheert analytics data voor de admin-pagina.
 * @returns {{ startDate, setStartDate, endDate, setEndDate, selectedUserId, setSelectedUserId,
 *   loading, error, users, loginStats, pageUsage, sessionStats, userLoginStats, clickStats,
 *   handleRefresh }}
 */
export function useAnalyticsData() {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [loginStats, setLoginStats] = useState(null);
  const [pageUsage, setPageUsage] = useState([]);
  const [sessionStats, setSessionStats] = useState(null);
  const [userLoginStats, setUserLoginStats] = useState([]);
  const [clickStats, setClickStats] = useState([]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await apiRequest('/admin/users');
      setUsers(data.users || []);
    } catch { /* stil falen */ }
  }, []);

  const loadAnalytics = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (selectedUserId) params.append('userId', selectedUserId);
      const qs = params.toString();

      const [pageRes, sessionRes] = await Promise.all([
        apiRequest(`/admin/analytics/page-usage?${qs}`),
        apiRequest(`/admin/analytics/sessions?${qs}`),
      ]);
      setPageUsage(pageRes.stats || []);
      setSessionStats(sessionRes);

      try {
        const loginRes = await apiRequest(`/admin/analytics/login-stats?${qs}`);
        setLoginStats(loginRes);
      } catch { setLoginStats({ by_day: [] }); }

      try {
        const userLoginRes = await apiRequest(`/admin/analytics/user-login-stats?${qs}`);
        setUserLoginStats(userLoginRes || []);
      } catch { setUserLoginStats([]); }

      try {
        const clickRes = await apiRequest(`/admin/analytics/click-stats?${qs}`);
        setClickStats(clickRes.stats || []);
      } catch { setClickStats([]); }
    } catch (err) {
      setError(err.message || 'Analytics laden mislukt');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedUserId]);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  return {
    startDate, setStartDate, endDate, setEndDate,
    selectedUserId, setSelectedUserId,
    loading, error,
    users, loginStats, pageUsage, sessionStats, userLoginStats, clickStats,
    handleRefresh: loadAnalytics,
  };
}

export function formatDuration(seconds) {
  if (!seconds) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}u ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
