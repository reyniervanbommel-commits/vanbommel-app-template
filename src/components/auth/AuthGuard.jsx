import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner, makeStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  loading: { marginTop: '40vh' },
});

export default function AuthGuard({ children, allowedRoles }) {
  const styles = useStyles();
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <Spinner label="Laden..." className={styles.loading} />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
