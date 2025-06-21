import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'data' | 'alerts' | 'security'>('general');
  const [saved, setSaved] = useState(false);

  // Mock settings state - in production, this would come from a settings service
  const [settings, setSettings] = useState({
    general: {
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      theme: 'light',
      autoRefresh: true,
      refreshInterval: 5
    },
    data: {
      retentionPeriod: 7,
      compressionEnabled: true,
      archiveAfterDays: 30,
      dataQualityChecks: true,
      failureRetryAttempts: 3
    },
    alerts: {
      emailNotifications: true,
      slackWebhook: '',
      collectionFailures: true,
      analysisCompletion: true,
      costThresholds: true,
      systemHealth: true
    },
    security: {
      sessionTimeout: 24,
      mfaEnabled: false,
      apiRateLimit: 100,
      ipWhitelist: '',
      auditLogging: true
    }
  });

  const handleSave = () => {
    // In production, this would save to backend
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const updateSetting = (category: keyof typeof settings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const tabs = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'data', name: 'Data Management', icon: '💾' },
    { id: 'alerts', name: 'Notifications', icon: '🔔' },
    { id: 'security', name: 'Security', icon: '🛡️' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-dark">Settings</h1>
          <p className="text-secondary mt-1">
            Configure your NEXUS_ENA platform preferences
          </p>
        </div>
        <button 
          onClick={handleSave}
          className={`btn ${saved ? 'btn-success' : 'btn-primary'}`}
        >
          {saved ? '✅ Saved' : '💾 Save Changes'}
        </button>
      </div>

      {/* User Info */}
      <div className="card bg-gradient-to-r from-primary-blue to-secondary-blue text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-semibold">{user?.name}</h3>
            <p className="text-blue-100">{user?.email}</p>
            <p className="text-blue-200 text-sm">
              Role: {user?.groups?.join(', ') || 'User'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="card">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-blue text-white'
                      : 'text-secondary hover:bg-light-gray hover:text-dark'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="font-medium">{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="card">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div>
                <h3 className="text-xl font-semibold mb-6">General Settings</h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                      <label className="form-label">Timezone</label>
                      <select 
                        className="form-select"
                        value={settings.general.timezone}
                        onChange={(e) => updateSetting('general', 'timezone', e.target.value)}
                      >
                        <option value="UTC">UTC</option>
                        <option value="EST">Eastern Time</option>
                        <option value="PST">Pacific Time</option>
                        <option value="CST">Central Time</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Date Format</label>
                      <select 
                        className="form-select"
                        value={settings.general.dateFormat}
                        onChange={(e) => updateSetting('general', 'dateFormat', e.target.value)}
                      >
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Theme</label>
                      <select 
                        className="form-select"
                        value={settings.general.theme}
                        onChange={(e) => updateSetting('general', 'theme', e.target.value)}
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Auto-refresh Interval (minutes)</label>
                      <select 
                        className="form-select"
                        value={settings.general.refreshInterval}
                        onChange={(e) => updateSetting('general', 'refreshInterval', parseInt(e.target.value))}
                      >
                        <option value={1}>1 minute</option>
                        <option value={5}>5 minutes</option>
                        <option value={10}>10 minutes</option>
                        <option value={30}>30 minutes</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="autoRefresh"
                      checked={settings.general.autoRefresh}
                      onChange={(e) => updateSetting('general', 'autoRefresh', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="autoRefresh" className="font-medium">
                      Enable automatic dashboard refresh
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Data Management Settings */}
            {activeTab === 'data' && (
              <div>
                <h3 className="text-xl font-semibold mb-6">Data Management</h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                      <label className="form-label">Data Retention Period (years)</label>
                      <select 
                        className="form-select"
                        value={settings.data.retentionPeriod}
                        onChange={(e) => updateSetting('data', 'retentionPeriod', parseInt(e.target.value))}
                      >
                        <option value={1}>1 year</option>
                        <option value={3}>3 years</option>
                        <option value={5}>5 years</option>
                        <option value={7}>7 years</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Archive After (days)</label>
                      <select 
                        className="form-select"
                        value={settings.data.archiveAfterDays}
                        onChange={(e) => updateSetting('data', 'archiveAfterDays', parseInt(e.target.value))}
                      >
                        <option value={30}>30 days</option>
                        <option value={60}>60 days</option>
                        <option value={90}>90 days</option>
                        <option value={180}>180 days</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Failure Retry Attempts</label>
                      <select 
                        className="form-select"
                        value={settings.data.failureRetryAttempts}
                        onChange={(e) => updateSetting('data', 'failureRetryAttempts', parseInt(e.target.value))}
                      >
                        <option value={1}>1 attempt</option>
                        <option value={3}>3 attempts</option>
                        <option value={5}>5 attempts</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="compression"
                        checked={settings.data.compressionEnabled}
                        onChange={(e) => updateSetting('data', 'compressionEnabled', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="compression" className="font-medium">
                        Enable data compression (Parquet format)
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="qualityChecks"
                        checked={settings.data.dataQualityChecks}
                        onChange={(e) => updateSetting('data', 'dataQualityChecks', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="qualityChecks" className="font-medium">
                        Enable data quality validation
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === 'alerts' && (
              <div>
                <h3 className="text-xl font-semibold mb-6">Notification Settings</h3>
                <div className="space-y-6">
                  <div className="form-group">
                    <label className="form-label">Slack Webhook URL (optional)</label>
                    <input 
                      type="url"
                      className="form-input"
                      placeholder="https://hooks.slack.com/services/..."
                      value={settings.alerts.slackWebhook}
                      onChange={(e) => updateSetting('alerts', 'slackWebhook', e.target.value)}
                    />
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">Alert Types</h4>
                    
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="emailNotifications"
                        checked={settings.alerts.emailNotifications}
                        onChange={(e) => updateSetting('alerts', 'emailNotifications', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="emailNotifications" className="font-medium">
                        Email notifications
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="collectionFailures"
                        checked={settings.alerts.collectionFailures}
                        onChange={(e) => updateSetting('alerts', 'collectionFailures', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="collectionFailures" className="font-medium">
                        Data collection failures
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="analysisCompletion"
                        checked={settings.alerts.analysisCompletion}
                        onChange={(e) => updateSetting('alerts', 'analysisCompletion', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="analysisCompletion" className="font-medium">
                        Weekly analysis completion
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="costThresholds"
                        checked={settings.alerts.costThresholds}
                        onChange={(e) => updateSetting('alerts', 'costThresholds', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="costThresholds" className="font-medium">
                        Cost threshold alerts ($18/month)
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="systemHealth"
                        checked={settings.alerts.systemHealth}
                        onChange={(e) => updateSetting('alerts', 'systemHealth', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="systemHealth" className="font-medium">
                        System health monitoring
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div>
                <h3 className="text-xl font-semibold mb-6">Security Settings</h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                      <label className="form-label">Session Timeout (hours)</label>
                      <select 
                        className="form-select"
                        value={settings.security.sessionTimeout}
                        onChange={(e) => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
                      >
                        <option value={1}>1 hour</option>
                        <option value={8}>8 hours</option>
                        <option value={24}>24 hours</option>
                        <option value={72}>72 hours</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">API Rate Limit (requests/minute)</label>
                      <select 
                        className="form-select"
                        value={settings.security.apiRateLimit}
                        onChange={(e) => updateSetting('security', 'apiRateLimit', parseInt(e.target.value))}
                      >
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                        <option value={500}>500</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">IP Whitelist (one per line)</label>
                    <textarea 
                      className="form-input"
                      rows={4}
                      placeholder="192.168.1.0/24&#10;10.0.0.0/8"
                      value={settings.security.ipWhitelist}
                      onChange={(e) => updateSetting('security', 'ipWhitelist', e.target.value)}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="mfaEnabled"
                        checked={settings.security.mfaEnabled}
                        onChange={(e) => updateSetting('security', 'mfaEnabled', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="mfaEnabled" className="font-medium">
                        Enable Multi-Factor Authentication (MFA)
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="auditLogging"
                        checked={settings.security.auditLogging}
                        onChange={(e) => updateSetting('security', 'auditLogging', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="auditLogging" className="font-medium">
                        Enable audit logging (CloudTrail)
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h4 className="font-semibold mb-3">💰 Cost Management</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-secondary">Current Month</span>
              <span className="font-medium text-success">$6.50</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Budget Limit</span>
              <span className="font-medium">$20.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Remaining</span>
              <span className="font-medium text-success">$13.50</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h4 className="font-semibold mb-3">🚀 Performance</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-secondary">Success Rate</span>
              <span className="font-medium text-success">98.5%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Avg Response</span>
              <span className="font-medium">1.2s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Uptime</span>
              <span className="font-medium text-success">99.9%</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h4 className="font-semibold mb-3">🛡️ Security Status</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-secondary">WAF Protection</span>
              <span className="status-indicator status-success">Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">SSL Certificate</span>
              <span className="status-indicator status-success">Valid</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Last Scan</span>
              <span className="text-secondary text-sm">2 hours ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;