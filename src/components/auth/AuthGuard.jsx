import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '@fluentui/react-components';

export default function AuthGuard({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Spinner label="Laden..." style={{ marginTop: '40vh' }} />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
