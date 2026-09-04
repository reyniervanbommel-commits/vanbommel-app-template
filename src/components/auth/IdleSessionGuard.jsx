import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useIdleSession } from '../../hooks/useIdleSession';
import {
  SESSION_END_REASON,
  setSessionExpiredHandler,
} from '../../utils/sessionExpiry';
import IdleSessionWarningDialog from './IdleSessionWarningDialog';

/**
 * Idle timeout (2 h) plus 401 session-expiry redirect.
 */
export default function IdleSessionGuard() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const endingRef = useRef(false);

  const endSession = useCallback(async (reason) => {
    if (endingRef.current) return;
    endingRef.current = true;
    try {
      await logout();
    } finally {
      navigate(`/login?reason=${encodeURIComponent(reason)}`, { replace: true });
    }
  }, [logout, navigate]);

  const handleIdle = useCallback(() => {
    endSession(SESSION_END_REASON.IDLE);
  }, [endSession]);

  const handleSignOutNow = useCallback(() => {
    endSession(SESSION_END_REASON.IDLE);
  }, [endSession]);

  useEffect(() => {
    if (isAuthenticated) endingRef.current = false;
    setSessionExpiredHandler((reason) => {
      endSession(reason || SESSION_END_REASON.EXPIRED);
    });
    return () => setSessionExpiredHandler(null);
  }, [endSession, isAuthenticated]);

  const { warningOpen, secondsLeft, staySignedIn } = useIdleSession({
    enabled: isAuthenticated,
    onIdle: handleIdle,
  });

  return (
    <IdleSessionWarningDialog
      open={Boolean(isAuthenticated && warningOpen)}
      secondsLeft={secondsLeft}
      onStaySignedIn={staySignedIn}
      onSignOut={handleSignOutNow}
    />
  );
}
