import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface NavItem {
  name: string;
  path: string;
  icon: string;
  description?: string;
}

const Sidebar: React.FC = () => {
  const location = useLocation();

  const navItems: NavItem[] = [
    {
      name: 'Dashboard',
      path: '/',
      icon: '📊',
      description: 'Overview and key metrics'
    },
    {
      name: 'Data Sources',
      path: '/data-sources',
      icon: '📡',
      description: 'Monitor data collection status'
    },
    {
      name: 'Reports',
      path: '/reports',
      icon: '📈',
      description: 'Weekly analysis reports'
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: '⚙️',
      description: 'System configuration'
    }
  ];

  const isActiveRoute = (path: string): boolean => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside 
      className="fixed left-0 top-0 bg-white shadow-lg border-r border-gray-200 z-40 overflow-y-auto"
      style={{ 
        width: 'var(--sidebar-width)', 
        height: '100vh',
        paddingTop: 'var(--header-height)'
      }}
    >
      <div className="p-6">
        {/* Navigation Menu */}
        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                  isActiveRoute(item.path)
                    ? 'bg-primary-blue text-white shadow-md'
                    : 'text-medium-gray hover:bg-light-gray hover:text-dark'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                {item.description && (
                  <p className={`text-xs mt-1 ${
                    isActiveRoute(item.path) 
                      ? 'text-blue-100' 
                      : 'text-gray-500 group-hover:text-gray-600'
                  }`}>
                    {item.description}
                  </p>
                )}
              </div>
              {isActiveRoute(item.path) && (
                <div className="w-2 h-2 bg-white rounded-full"></div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Separator */}
        <div className="border-t border-gray-200 my-6"></div>

        {/* System Information */}
        <div className="space-y-4">
          <div className="bg-light-gray rounded-lg p-4">
            <h4 className="font-semibold text-dark text-sm mb-2">System Status</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-secondary">Data Collection</span>
                <span className="status-indicator status-success">
                  <div className="w-2 h-2 bg-accent-green rounded-full"></div>
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-secondary">Analysis Engine</span>
                <span className="status-indicator status-success">
                  <div className="w-2 h-2 bg-accent-green rounded-full"></div>
                  Ready
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-secondary">API Gateway</span>
                <span className="status-indicator status-success">
                  <div className="w-2 h-2 bg-accent-green rounded-full"></div>
                  Online
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-light-gray rounded-lg p-4">
            <h4 className="font-semibold text-dark text-sm mb-2">Quick Stats</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-secondary">Today's Collections</span>
                <span className="text-xs font-medium text-dark">5/5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-secondary">Success Rate</span>
                <span className="text-xs font-medium text-accent-green">98.5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-secondary">Data Points</span>
                <span className="text-xs font-medium text-dark">2,847</span>
              </div>
            </div>
          </div>

          {/* Next Analysis */}
          <div className="bg-gradient-to-r from-primary-blue to-secondary-blue rounded-lg p-4 text-white">
            <h4 className="font-semibold text-sm mb-2">🔮 Next AI Analysis</h4>
            <p className="text-xs opacity-90">
              Sunday, 2:00 AM UTC
            </p>
            <p className="text-xs opacity-75 mt-1">
              Weekly market insights powered by Claude AI
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs text-secondary">
              NEXUS_ENA v1.0.0
            </p>
            <p className="text-xs text-secondary mt-1">
              Built with AWS Serverless
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;