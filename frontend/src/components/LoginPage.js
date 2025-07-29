import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { AlertCircle, LogIn } from 'lucide-react';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  // Load remembered username on component mount
  useEffect(() => {
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    if (rememberedUsername) {
      setUsername(rememberedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);
    
    if (result.success) {
      // Handle Remember Me functionality
      if (rememberMe) {
        localStorage.setItem('rememberedUsername', username);
      } else {
        localStorage.removeItem('rememberedUsername');
      }
    } else {
      setError(result.error);
      setLoading(false);
    }
    // Don't set loading to false here for successful logins to avoid flash
    // The user will be redirected automatically
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Official Logo */}
          <div className="flex justify-center mb-8">
            <img 
              src="https://www.printandsmile.com.tr/data/images/printandsmile-logo.svg" 
              alt="Print and Smile Logo" 
              className="h-24 w-auto max-w-sm"
              style={{ maxHeight: '96px' }}
              onLoad={() => {
                console.log('Print and Smile logo loaded successfully');
              }}
              onError={(e) => {
                console.log('Logo failed to load, hiding element');
                e.target.style.display = 'none';
              }}
            />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Printing Cost Calculator
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access the application
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn size={20} />
              Sign In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle size={16} className="text-red-600" />
                  <div>
                    <span className="text-red-700 text-sm">{error}</span>
                    {error.includes('Incorrect username or password') && (
                      <div className="text-xs text-red-600 mt-1">
                        <p>Please ensure you're using the correct credentials:</p>
                        <p><strong>Username:</strong> Emre (case-sensitive)</p>
                        <p><strong>Password:</strong> 169681ymc</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  disabled={loading}
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={setRememberMe}
                  disabled={loading}
                />
                <Label htmlFor="rememberMe" className="text-sm">
                  Remember my username on this device
                </Label>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;