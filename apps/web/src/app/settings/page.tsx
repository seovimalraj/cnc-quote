'use client';

import DefaultLayout from '@/components/Layouts/DefaultLayout';
import { useState } from 'react';
import {
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    // General Settings
    companyName: 'CNC Quote Pro',
    companyEmail: 'admin@cncquote.com',
    companyPhone: '+1 (555) 123-4567',
    companyAddress: '123 Manufacturing St, Industrial City, IC 12345',
    timezone: 'America/New_York',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    
    // Notification Settings
    emailNotifications: true,
    smsNotifications: false,
    quoteRequestNotifications: true,
    orderUpdateNotifications: true,
    paymentNotifications: true,
    marketingEmails: false,
    
    // Pricing Settings
    defaultMargin: 25,
    rushSurcharge: 50,
    minimumOrderValue: 500,
    standardLeadTime: 7,
    rushLeadTime: 3,
    
    // Security Settings
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
    ipWhitelist: '',
    
    // API Settings
    apiEnabled: true,
    webhookUrl: '',
    rateLimitPerHour: 1000,
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = () => {
    // In a real app, this would save to the backend
    console.log('Saving settings:', settings);
    alert('Settings saved successfully!');
  };

  const tabs = [
    { id: 'general', label: 'General', icon: CogIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'pricing', label: 'Pricing', icon: CurrencyDollarIcon },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon },
    { id: 'api', label: 'API & Webhooks', icon: GlobeAltIcon },
  ];

  return (
    <DefaultLayout>
      <div className="grid grid-cols-1 gap-9">
        {/* Page Header */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">
              System Settings
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-9">
          {/* Tabs Sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="p-7">
                <nav className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary text-white'
                          : 'text-black hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800'
                      }`}
                    >
                      <tab.icon className="h-5 w-5" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="p-7">
                {/* General Settings */}
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-medium text-black dark:text-white mb-4">
                      General Settings
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                          Company Name
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={settings.companyName}
                            onChange={(e) => handleSettingChange('companyName', e.target.value)}
                            className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent py-3 px-5 pl-12 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                          />
                          <BuildingOfficeIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-meta-5" />
                        </div>
                      </div>
                      
                      <div>
                        <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                          Company Email
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            value={settings.companyEmail}
                            onChange={(e) => handleSettingChange('companyEmail', e.target.value)}
                            className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent py-3 px-5 pl-12 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                          />
                          <EnvelopeIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-meta-5" />
                        </div>
                      </div>
                      
                      <div>
                        <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={settings.companyPhone}
                          onChange={(e) => handleSettingChange('companyPhone', e.target.value)}
                          className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        />
                      </div>
                      
                      <div>
                        <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                          Timezone
                        </label>
                        <select
                          value={settings.timezone}
                          onChange={(e) => handleSettingChange('timezone', e.target.value)}
                          className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        >
                          <option value="America/New_York">Eastern Time (UTC-5)</option>
                          <option value="America/Chicago">Central Time (UTC-6)</option>
                          <option value="America/Denver">Mountain Time (UTC-7)</option>
                          <option value="America/Los_Angeles">Pacific Time (UTC-8)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                          Currency
                        </label>
                        <select
                          value={settings.currency}
                          onChange={(e) => handleSettingChange('currency', e.target.value)}
                          className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        >
                          <option value="USD">USD - US Dollar</option>
                          <option value="EUR">EUR - Euro</option>
                          <option value="GBP">GBP - British Pound</option>
                          <option value="CAD">CAD - Canadian Dollar</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                          Date Format
                        </label>
                        <select
                          value={settings.dateFormat}
                          onChange={(e) => handleSettingChange('dateFormat', e.target.value)}
                          className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        >
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                        Company Address
                      </label>
                      <textarea
                        value={settings.companyAddress}
                        onChange={(e) => handleSettingChange('companyAddress', e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      />
                    </div>
                  </div>
                )}

                {/* Notification Settings */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-medium text-black dark:text-white mb-4">
                      Notification Preferences
                    </h4>
                    
                    <div className="space-y-4">
                      {[
                        { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email' },
                        { key: 'smsNotifications', label: 'SMS Notifications', description: 'Receive notifications via text message' },
                        { key: 'quoteRequestNotifications', label: 'Quote Requests', description: 'Get notified when new quote requests are submitted' },
                        { key: 'orderUpdateNotifications', label: 'Order Updates', description: 'Get notified when order status changes' },
                        { key: 'paymentNotifications', label: 'Payment Notifications', description: 'Get notified about payment status changes' },
                        { key: 'marketingEmails', label: 'Marketing Emails', description: 'Receive marketing and promotional emails' },
                      ].map((notification) => (
                        <div key={notification.key} className="flex items-center justify-between py-3 border-b border-stroke dark:border-strokedark">
                          <div>
                            <p className="text-black dark:text-white font-medium">{notification.label}</p>
                            <p className="text-sm text-meta-5">{notification.description}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings[notification.key as keyof typeof settings] as boolean}
                              onChange={(e) => handleSettingChange(notification.key, e.target.checked)}
                              className="sr-only"
                            />
                            <div className={`w-11 h-6 rounded-full transition-colors ${
                              settings[notification.key as keyof typeof settings] ? 'bg-primary' : 'bg-gray-300'
                            }`}>
                              <div className={`w-4 h-4 bg-white rounded-full transition-transform transform mt-1 ${
                                settings[notification.key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-1'
                              }`}></div>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pricing Settings */}
                {activeTab === 'pricing' && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-medium text-black dark:text-white mb-4">
                      Pricing Configuration
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                          Default Margin (%)
                        </label>
                        <input
                          type="number"
                          value={settings.defaultMargin}
                          onChange={(e) => handleSettingChange('defaultMargin', parseInt(e.target.value))}
                          className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                          min="0"
                          max="100"
                        />
                      </div>
                      
                      <div>
                        <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                          Rush Surcharge (%)
                        </label>
                        <input
                          type="number"
                          value={settings.rushSurcharge}
                          onChange={(e) => handleSettingChange('rushSurcharge', parseInt(e.target.value))}
                          className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                          min="0"
                        />
                      </div>
                      
                      <div>
                        <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                          Minimum Order Value ($)
                        </label>
                        <input
                          type="number"
                          value={settings.minimumOrderValue}
                          onChange={(e) => handleSettingChange('minimumOrderValue', parseInt(e.target.value))}
                          className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                          min="0"
                        />
                      </div>
                      
                      <div>
                        <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                          Standard Lead Time (days)
                        </label>
                        <input
                          type="number"
                          value={settings.standardLeadTime}
                          onChange={(e) => handleSettingChange('standardLeadTime', parseInt(e.target.value))}
                          className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                          min="1"
                        />
                      </div>
                      
                      <div>
                        <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                          Rush Lead Time (days)
                        </label>
                        <input
                          type="number"
                          value={settings.rushLeadTime}
                          onChange={(e) => handleSettingChange('rushLeadTime', parseInt(e.target.value))}
                          className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                          min="1"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Settings */}
                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-medium text-black dark:text-white mb-4">
                      Security Configuration
                    </h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-3 border-b border-stroke dark:border-strokedark">
                        <div>
                          <p className="text-black dark:text-white font-medium">Two-Factor Authentication</p>
                          <p className="text-sm text-meta-5">Add an extra layer of security to your account</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.twoFactorAuth}
                            onChange={(e) => handleSettingChange('twoFactorAuth', e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-11 h-6 rounded-full transition-colors ${
                            settings.twoFactorAuth ? 'bg-primary' : 'bg-gray-300'
                          }`}>
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform transform mt-1 ${
                              settings.twoFactorAuth ? 'translate-x-6' : 'translate-x-1'
                            }`}></div>
                          </div>
                        </label>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                          Session Timeout (minutes)
                        </label>
                        <input
                          type="number"
                          value={settings.sessionTimeout}
                          onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                          className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                          min="5"
                          max="1440"
                        />
                      </div>
                      
                      <div>
                        <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                          Password Expiry (days)
                        </label>
                        <input
                          type="number"
                          value={settings.passwordExpiry}
                          onChange={(e) => handleSettingChange('passwordExpiry', parseInt(e.target.value))}
                          className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                          min="30"
                          max="365"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                        IP Whitelist (comma-separated)
                      </label>
                      <textarea
                        value={settings.ipWhitelist}
                        onChange={(e) => handleSettingChange('ipWhitelist', e.target.value)}
                        placeholder="192.168.1.1, 10.0.0.1"
                        rows={3}
                        className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      />
                    </div>
                  </div>
                )}

                {/* API Settings */}
                {activeTab === 'api' && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-medium text-black dark:text-white mb-4">
                      API & Webhook Configuration
                    </h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-3 border-b border-stroke dark:border-strokedark">
                        <div>
                          <p className="text-black dark:text-white font-medium">API Access</p>
                          <p className="text-sm text-meta-5">Enable external API access to your CNC Quote system</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.apiEnabled}
                            onChange={(e) => handleSettingChange('apiEnabled', e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-11 h-6 rounded-full transition-colors ${
                            settings.apiEnabled ? 'bg-primary' : 'bg-gray-300'
                          }`}>
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform transform mt-1 ${
                              settings.apiEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}></div>
                          </div>
                        </label>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                          Rate Limit (requests/hour)
                        </label>
                        <input
                          type="number"
                          value={settings.rateLimitPerHour}
                          onChange={(e) => handleSettingChange('rateLimitPerHour', parseInt(e.target.value))}
                          className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                          min="100"
                          max="10000"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                        Webhook URL
                      </label>
                      <input
                        type="url"
                        value={settings.webhookUrl}
                        onChange={(e) => handleSettingChange('webhookUrl', e.target.value)}
                        placeholder="https://your-app.com/webhook"
                        className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      />
                      <p className="text-sm text-meta-5 mt-2">
                        Webhook URL to receive real-time notifications about quote and order updates
                      </p>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="mt-8 pt-6 border-t border-stroke dark:border-strokedark">
                  <div className="flex justify-end">
                    <button
                      onClick={saveSettings}
                      className="inline-flex items-center justify-center rounded-md bg-primary py-4 px-10 text-center font-medium text-white hover:bg-opacity-90"
                    >
                      Save Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default SettingsPage;
