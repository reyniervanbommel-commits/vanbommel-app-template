import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../utils/api';

/**
 * useAnalyticsData
 * Laadt en beheert analytics data voor het admin-scherm.
 */
export function useAnalyticsData() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [loginStats, setLoginStats] = useState(null);
  const [pageUsage, setPageUsage] = useState([]);
  const [sessionStats, setSessionStats] = useState(null);
  const [userLoginStats, setUserLoginStats] = useState([]);

  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const data = await apiRequest('/admin/users');
      setUsers(data.users || []);
    } catch { /* stil falen is ok */ }
  }, []);

  const loadAnalytics = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ startDate, endDate });
    if (selectedUserId) params.append('userId', selectedUserId);
    const qs = params.toString();

    try {
      const [pageRes, sessionRes] = await Promise.all([
        apiRequest(`/admin/analytics/page-usage?${qs}`),
        apiRequest(`/admin/analytics/sessions?${qs}`),
      ]);
      setPageUsage(pageRes.stats || []);
      setSessionStats(sessionRes);

      const loginRes = await apiRequest(`/admin/analytics/login-stats?${qs}`).catch(() => ({ by_day: [] }));
      setLoginStats(loginRes);

      const userLoginRes = await apiRequest(`/admin/analytics/user-login-stats?${qs}`).catch(() => []);
      setUserLoginStats(Array.isArray(userLoginRes) ? userLoginRes : []);
    } catch (err) {
      setError('Analytics laden mislukt: ' + (err.message || 'onbekende fout'));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedUserId]);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  const handleRefresh = useCallback(() => loadAnalytics(), [loadAnalytics]);

  return {
    startDate, setStartDate, endDate, setEndDate,
    selectedUserId, setSelectedUserId,
    loading, error, users,
    loginStats, pageUsage, sessionStats, userLoginStats,
    handleRefresh,
  };
}

export function formatDuration(seconds) {
  if (!seconds) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}u ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
