import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const Header: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50" style={{ height: 'var(--header-height)' }}>
      <div className="flex items-center justify-between h-full px-6">
        {/* Logo and Title */}
        <div className="flex items-center">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary-blue rounded flex items-center justify-center mr-3">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-dark">NEXUS_ENA</h1>
              <p className="text-xs text-secondary">Energy Nexus Analytics</p>
            </div>
          </div>
        </div>

        {/* User Menu */}
        <div className="flex items-center space-x-4">
          {/* System Status Indicator */}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-accent-green rounded-full"></div>
            <span className="text-sm text-secondary">System Online</span>
          </div>

          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-dark">{user?.name}</p>
              <p className="text-xs text-secondary">{user?.email}</p>
            </div>
            
            {/* User Avatar */}
            <div className="w-8 h-8 bg-primary-blue rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="text-secondary hover:text-dark transition-colors p-2 rounded"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;