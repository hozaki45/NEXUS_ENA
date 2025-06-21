import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const { login, isAuthenticated, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      return;
    }

    try {
      setIsSubmitting(true);
      await login(email, password);
    } catch (error) {
      // Error is handled by auth context
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = (userType: 'admin' | 'analyst') => {
    if (userType === 'admin') {
      setEmail('admin@nexus-ena.com');
      setPassword('admin123');
    } else {
      setEmail('analyst@nexus-ena.com');
      setPassword('analyst123');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-blue to-secondary-blue flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-primary-blue font-bold text-2xl">N</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">NEXUS_ENA</h1>
          <p className="text-blue-100">Energy Nexus Analytics Platform</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-dark mb-6 text-center">
            Sign In
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-danger">⚠️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="Enter your email"
                required
                disabled={isSubmitting || isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Enter your password"
                required
                disabled={isSubmitting || isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading || !email || !password}
              className="w-full btn btn-primary"
            >
              {isSubmitting || isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="loading-spinner mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowDemoCredentials(!showDemoCredentials)}
              className="w-full text-center text-sm text-secondary hover:text-dark transition-colors"
            >
              {showDemoCredentials ? 'Hide' : 'Show'} Demo Credentials
            </button>

            {showDemoCredentials && (
              <div className="mt-4 space-y-3">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-primary-blue mb-2">
                    Administrator Account
                  </h4>
                  <p className="text-xs text-secondary mb-2">
                    Full access to all features and settings
                  </p>
                  <button
                    onClick={() => handleDemoLogin('admin')}
                    className="btn btn-secondary text-xs"
                    disabled={isSubmitting || isLoading}
                  >
                    Use Admin Login
                  </button>
                  <div className="mt-2 text-xs text-secondary">
                    <p>Email: admin@nexus-ena.com</p>
                    <p>Password: admin123</p>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-accent-green mb-2">
                    Energy Analyst Account
                  </h4>
                  <p className="text-xs text-secondary mb-2">
                    Access to dashboards and reports
                  </p>
                  <button
                    onClick={() => handleDemoLogin('analyst')}
                    className="btn btn-success text-xs"
                    disabled={isSubmitting || isLoading}
                  >
                    Use Analyst Login
                  </button>
                  <div className="mt-2 text-xs text-secondary">
                    <p>Email: analyst@nexus-ena.com</p>
                    <p>Password: analyst123</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* System Information */}
        <div className="mt-8 text-center text-blue-100 text-sm">
          <p>Powered by AWS Serverless Architecture</p>
          <p className="mt-1">Secure • Scalable • Cost-Optimized</p>
        </div>

        {/* Features */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div className="text-blue-100">
            <div className="text-2xl mb-1">📊</div>
            <p className="text-xs">Real-time Monitoring</p>
          </div>
          <div className="text-blue-100">
            <div className="text-2xl mb-1">🤖</div>
            <p className="text-xs">AI-Powered Analysis</p>
          </div>
          <div className="text-blue-100">
            <div className="text-2xl mb-1">🛡️</div>
            <p className="text-xs">Enterprise Security</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;