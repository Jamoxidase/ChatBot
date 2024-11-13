import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

const API_URL = 'http://localhost:8080';

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [authError, setAuthError] = useState(null);

  const authenticate = async (password) => {
    try {
      const response = await fetch(`${API_URL}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('Auth successful, token:', data.token); // Debug log
        setIsAuthenticated(true);
        setAuthToken(data.token);
        setAuthError(null);
        return true;
      } else {
        setAuthError(data.error || 'Authentication failed');
        setIsAuthenticated(false);
        setAuthToken(null);
        return false;
      }
    } catch (err) {
      console.error('Auth error:', err);
      setAuthError('Authentication failed');
      setIsAuthenticated(false);
      setAuthToken(null);
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setAuthToken(null);
    setAuthError(null);
  };

  const value = {
    isAuthenticated,
    authToken,
    authError,
    authenticate,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};