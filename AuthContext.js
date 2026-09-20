import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api, { setAccessToken, getAccessToken } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAuthStatus = useCallback(async () => {
    try {
      if (!getAccessToken()) {
        // No access token in memory (e.g. hard refresh). Try the refresh
        // cookie once before giving up -- this is what keeps a user logged
        // in across browser restarts without storing anything readable by JS.
        const { data } = await api.post('/auth/refresh-token');
        setAccessToken(data.accessToken);
        setUser(data.user);
      } else {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
      }
    } catch (err) {
      setAccessToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // If the axios interceptor gives up on refreshing (refresh token expired
  // too), make sure the UI reflects that the user is logged out.
  useEffect(() => {
    const handleForcedLogout = () => setUser(null);
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const { data } = await api.post('/auth/login', { email, password });
      setAccessToken(data.accessToken);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || 'Login failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const register = async (formData) => {
    try {
      setError(null);
      const { data } = await api.post('/auth/register', formData);
      setAccessToken(data.accessToken);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || 'Registration failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // even if the network call fails, clear local state
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  const updateProfile = async (updates) => {
    try {
      setError(null);
      const { data } = await api.put('/auth/me', updates);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || 'Update failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      setError(null);
      await api.put('/auth/me/password', { currentPassword, newPassword });
      setAccessToken(null);
      setUser(null);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || 'Could not change password';
      setError(message);
      return { success: false, error: message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
