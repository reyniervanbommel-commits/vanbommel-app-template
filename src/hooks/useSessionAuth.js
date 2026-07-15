import { useCallback, useEffect, useMemo, useState } from 'react';

async function apiRequest(path, options) {
  const opts = options || {};
  const res = await fetch('/api/auth' + path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    method: opts.method || 'GET',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export function useSessionAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/me');
      setUser(data.user);
      setError(null);
      return data;
    } catch (_) {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = useCallback(async (email, password) => {
    const data = await apiRequest('/login', { method: 'POST', body: { email, password } });
    if (data.user) setUser(data.user);
    return data;
  }, []);

  const setPassword = useCallback(async (email, password) => {
    const data = await apiRequest('/set-password', { method: 'POST', body: { email, password } });
    if (data.user) setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await apiRequest('/logout', { method: 'POST', body: {} }); } finally { setUser(null); }
  }, []);

  const actions = useMemo(() => ({ login, logout, checkAuth, setPassword }), [login, logout, checkAuth, setPassword]);

  return useMemo(() => ({
    user, loading, error,
    isAuthenticated: Boolean(user),
    actions,
  }), [user, loading, error, actions]);
}
