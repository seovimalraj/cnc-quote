process.env.TZ = 'UTC';

const envDefaults: Record<string, string> = {
	REDIS_URL: 'redis://localhost:6379',
	WORKER_CONCURRENCY_DEFAULT: '1',
	WORKER_MAX_ATTEMPTS_DEFAULT: '3',
	JOB_TTL_SECONDS: '604800',
	API_BASE_URL: 'http://localhost:3001',
	CAD_SERVICE_URL: 'http://localhost:8000',
	SUPABASE_URL: 'https://example.supabase.co',
	SUPABASE_SERVICE_KEY: 'service-key',
	OLLAMA_HOST: 'http://localhost:11434',
	OLLAMA_MODEL: 'llama3.1:8b',
	OLLAMA_TIMEOUT_MS: '45000',
	COMPLIANCE_ROLLUP_CRON: '0 2 * * *',
	HEALTH_PORT: '3101',
};

for (const [key, value] of Object.entries(envDefaults)) {
	if (!process.env[key]) {
		process.env[key] = value;
	}
}

if (!process.env.NODE_ENV) {
	(process as any).env.NODE_ENV = 'test';
}

// Route axios.create(...).post calls to the global axios.post so existing spies work in tests
try {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
		const axios = require('axios');
		const originalCreate = axios.create;
		axios.create = ((...args: any[]) => {
			originalCreate(...args);
			return {
				post: (...postArgs: any[]) => axios.post(...postArgs),
			};
		}) as any;
} catch {}
