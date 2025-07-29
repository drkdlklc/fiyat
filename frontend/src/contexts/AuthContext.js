import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  console.log('AuthProvider render - user:', user, 'loading:', loading, 'token:', !!token);

  // Set up axios interceptor to include token in requests
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/me`);
          setUser(response.data);
        } catch (error) {
          console.error('Auth check failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    // Only check auth if we don't already have user data (avoid race condition with login)
    if (token && !user) {
      checkAuth();
    } else {
      setLoading(false);
    }
  }, [token, user]);

  const login = async (username, password) => {
    try {
      console.log('Login attempt started for username:', username);
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/login`, {
        username,
        password
      });

      console.log('Login API response:', response.status, response.data);
      const { access_token } = response.data;
      
      if (!access_token) {
        console.error('No access token received');
        return { success: false, error: 'No access token received' };
      }
      
      // Store token first
      localStorage.setItem('token', access_token);
      setToken(access_token);
      console.log('Token set in state and localStorage');
      
      // Get user info directly and set user state
      console.log('Fetching user info...');
      const userResponse = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/me`);
      console.log('User API response:', userResponse.status, userResponse.data);
      
      setUser(userResponse.data);
      console.log('User set in state, login should be complete');

      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      console.error('Error details:', error.response?.data);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.is_admin) return true;
    
    switch (permission) {
      case 'calculator':
        return user.permissions?.can_access_calculator || false;
      case 'machines':
        return user.permissions?.can_access_machines || false;
      case 'papers':
        return user.permissions?.can_access_papers || false;
      case 'extras':
        return user.permissions?.can_access_extras || false;
      case 'input_prices':
        return user.permissions?.can_see_input_prices || false;
      default:
        return false;
    }
  };

  const canSeeInputPrices = () => {
    if (!user) return false;
    if (user.is_admin) return true;
    return user.permissions?.can_see_input_prices || false;
  };

  const getPriceMultiplier = () => {
    return user?.price_multiplier || 1.0;
  };

  const applyPriceMultiplier = (price) => {
    return price * getPriceMultiplier();
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
    hasPermission,
    canSeeInputPrices,
    getPriceMultiplier,
    applyPriceMultiplier
  };

  console.log('AuthProvider value - isAuthenticated:', !!user, 'user:', user);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};