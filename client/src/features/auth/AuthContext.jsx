import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore authenticated session on page load
  useEffect(() => {
    async function initAuth() {
      try {
        // Fetch CSRF token first
        await api.get('/auth/csrf-token');
        // Fetch authenticated user profile
        const res = await api.get('/auth/me');
        if (res.data?.success && res.data.user) {
          setUser(res.data.user);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener('schedulix:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('schedulix:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      // Ensure CSRF token is present
      await api.get('/auth/csrf-token');
      const res = await api.post('/auth/login', { email, password });
      if (res.data?.success && res.data.user) {
        setUser(res.data.user);
        return { success: true };
      }
      return { success: false, message: 'Invalid response from server' };
    } catch (err) {
      const msg = err.response?.data?.message || 'Authentication failed. Please verify credentials.';
      setError(msg);
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore logout errors
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    role: user?.role || 'anonymous',
    isAuthenticated: Boolean(user),
    loading,
    error,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
