import { NextPage } from 'next';
import { useState } from 'react';
import Link from 'next/link';

const AdminDevToolsPage: NextPage = () => {
  const [activeTab, setActiveTab] = useState('webhooks');
  const [isProduction, setIsProduction] = useState(false); // In real app, check from environment

  const tabs = [
    { id: 'webhooks', label: 'Send Test Webhook' },
    { id: 'seed_data', label: 'Seed Sample Data' },
    { id: 'emails', label: 'Email Tests' },
    { id: 'queues', label: 'Queue Jobs' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="flex mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li><Link href="/admin" className="text-gray-400 hover:text-gray-500">Admin</Link></li>
              <li><span className="text-gray-500">/</span></li>
              <li><Link href="/admin/dev" className="text-gray-400 hover:text-gray-500">Developer Utilities</Link></li>
              <li><span className="text-gray-500">/</span></li>
              <li><span className="text-gray-900 font-medium">Test Tools</span></li>
            </ol>
          </nav>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Test Tools</h1>
              <div className="mt-2 flex items-center space-x-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  isProduction
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {isProduction ? 'Production' : 'Development'}
                </span>
                <span className="text-gray-600 text-sm">
                  Tools are disabled in production. All actions are audit-logged.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {activeTab === 'webhooks' && <WebhookTab isProduction={isProduction} />}
          {activeTab === 'seed_data' && <SeedDataTab isProduction={isProduction} />}
          {activeTab === 'emails' && <EmailTab isProduction={isProduction} />}
          {activeTab === 'queues' && <QueueTab isProduction={isProduction} />}
        </div>
      </div>
    </div>
  );
};

const WebhookTab: React.FC<{ isProduction: boolean }> = ({ isProduction }) => {
  const [provider, setProvider] = useState('Stripe');
  const [eventType, setEventType] = useState('checkout.session.completed');
  const [payload, setPayload] = useState(`{
  "id": "evt_test_webhook",
  "object": "event",
  "api_version": "2020-08-27",
  "created": 1630000000,
  "data": {
    "object": {
      "id": "cs_test_123",
      "object": "checkout.session",
      "amount_total": 2000,
      "currency": "usd",
      "customer": "cus_test_123",
      "payment_status": "paid"
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": "req_test_123",
    "idempotency_key": null
  },
  "type": "checkout.session.completed"
}`);
  const [signatureMode, setSignatureMode] = useState<'auto' | 'unsigned'>('auto');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSend = async () => {
    if (isProduction) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/dev/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          event_type: eventType,
          payload: JSON.parse(payload),
          signature_mode: signatureMode,
          user_id: 'test_user',
          ip_address: '127.0.0.1',
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Test Webhook</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                disabled={isProduction}
              >
                <option value="Stripe">Stripe</option>
                <option value="PayPal">PayPal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                disabled={isProduction}
              >
                {provider === 'Stripe' ? (
                  <>
                    <option value="checkout.session.completed">checkout.session.completed</option>
                    <option value="payment_intent.succeeded">payment_intent.succeeded</option>
                    <option value="charge.refunded">charge.refunded</option>
                  </>
                ) : (
                  <>
                    <option value="CHECKOUT.ORDER.APPROVED">CHECKOUT.ORDER.APPROVED</option>
                    <option value="PAYMENT.CAPTURE.COMPLETED">PAYMENT.CAPTURE.COMPLETED</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payload Template</label>
              <textarea
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
                rows={12}
                disabled={isProduction}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Signature Mode</label>
              <select
                value={signatureMode}
                onChange={(e) => setSignatureMode(e.target.value as 'auto' | 'unsigned')}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                disabled={isProduction}
              >
                <option value="auto">Auto-generate (dev secrets)</option>
                <option value="unsigned">Unsigned</option>
              </select>
            </div>

            <button
              onClick={handleSend}
              disabled={isProduction || loading}
              className={`w-full py-2 px-4 rounded-md font-medium ${
                isProduction
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Sending...' : 'Send Webhook'}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Console</h3>
          <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm h-96 overflow-y-auto">
            {result ? (
              <pre>{JSON.stringify(result, null, 2)}</pre>
            ) : (
              <div className="text-gray-500">Results will appear here...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SeedDataTab: React.FC<{ isProduction: boolean }> = ({ isProduction }) => {
  const [entities, setEntities] = useState<string[]>([]);
  const [withCadJobs, setWithCadJobs] = useState(false);
  const [withPayments, setWithPayments] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const availableEntities = [
    'Organization', 'User', 'Machines', 'Materials', 'Quotes (10)', 'Orders (5)'
  ];

  const handleSeed = async () => {
    if (isProduction) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/dev/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entities,
          with_cad_jobs: withCadJobs,
          with_payments: withPayments,
          user_id: 'test_user',
          ip_address: '127.0.0.1',
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Seed Sample Data</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entities</label>
              <div className="space-y-2">
                {availableEntities.map((entity) => (
                  <label key={entity} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={entities.includes(entity)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEntities([...entities, entity]);
                        } else {
                          setEntities(entities.filter(e => e !== entity));
                        }
                      }}
                      className="rounded border-gray-300"
                      disabled={isProduction}
                    />
                    <span className="ml-2 text-sm text-gray-700">{entity}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={withCadJobs}
                onChange={(e) => setWithCadJobs(e.target.checked)}
                className="rounded border-gray-300"
                disabled={isProduction}
              />
              <label className="ml-2 text-sm text-gray-700">
                Enqueue sample CAD analyses
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={withPayments}
                onChange={(e) => setWithPayments(e.target.checked)}
                className="rounded border-gray-300"
                disabled={isProduction}
              />
              <label className="ml-2 text-sm text-gray-700">
                Create fake payment events (local only)
              </label>
            </div>

            <button
              onClick={handleSeed}
              disabled={isProduction || loading || entities.length === 0}
              className={`w-full py-2 px-4 rounded-md font-medium ${
                isProduction || entities.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Seeding...' : 'Seed Data'}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Console</h3>
          <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm h-96 overflow-y-auto">
            {result ? (
              <pre>{JSON.stringify(result, null, 2)}</pre>
            ) : (
              <div className="text-gray-500">Results will appear here...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const EmailTab: React.FC<{ isProduction: boolean }> = ({ isProduction }) => {
  const [template, setTemplate] = useState('quote_sent');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSend = async () => {
    if (isProduction) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/dev/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template,
          to,
          user_id: 'test_user',
          ip_address: '127.0.0.1',
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Test Email</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              disabled={isProduction}
            >
              <option value="quote_sent">Quote Sent</option>
              <option value="order_confirmation">Order Confirmation</option>
              <option value="shipment_notice">Shipment Notice</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Email</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="test@example.com"
              disabled={isProduction}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={isProduction || loading || !to}
            className={`w-full py-2 px-4 rounded-md font-medium ${
              isProduction || !to
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? 'Sending...' : 'Send Test Email'}
          </button>
        </div>

        {result && (
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <pre className="text-sm text-gray-700">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

const QueueTab: React.FC<{ isProduction: boolean }> = ({ isProduction }) => {
  const [job, setJob] = useState('cad:analyze');
  const [payload, setPayload] = useState('{\n  "file_id": "test_file_123"\n}');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleEnqueue = async () => {
    if (isProduction) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/dev/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job,
          payload: JSON.parse(payload),
          user_id: 'test_user',
          ip_address: '127.0.0.1',
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Enqueue Job</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
              <select
                value={job}
                onChange={(e) => setJob(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                disabled={isProduction}
              >
                <option value="cad:analyze">CAD Analyze</option>
                <option value="qap:render">QAP Render</option>
                <option value="pricing:rebuild-cache">Pricing Rebuild Cache</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payload</label>
              <textarea
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
                rows={8}
                disabled={isProduction}
              />
            </div>

            <button
              onClick={handleEnqueue}
              disabled={isProduction || loading}
              className={`w-full py-2 px-4 rounded-md font-medium ${
                isProduction
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Enqueuing...' : 'Enqueue Job'}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Console</h3>
          <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm h-96 overflow-y-auto">
            {result ? (
              <pre>{JSON.stringify(result, null, 2)}</pre>
            ) : (
              <div className="text-gray-500">Results will appear here...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDevToolsPage;
