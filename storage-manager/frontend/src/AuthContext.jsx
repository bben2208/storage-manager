import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, log } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // load user on app start if token exists
  useEffect(() => {
    async function init() {
      const token = localStorage.getItem('sm_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        log('auth/me response', res.data);
        setUser(res.data);
      } catch (err) {
        console.error('Error loading session', err);
        localStorage.removeItem('sm_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    log('login response', res.data);
    const { token, user } = res.data;

    localStorage.setItem('sm_token', token);
    setUser(user);
  }

  function logout() {
    localStorage.removeItem('sm_token');
    setUser(null);
  }

  const value = {
    user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
