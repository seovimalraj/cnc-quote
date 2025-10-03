import * as fs from 'fs';
import * as path from 'path';

// Required environment variables for each service
const requiredEnvVars = {
  web: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_PAYPAL_CLIENT_ID'
  ],
  api: [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'REDIS_URL',
    'PAYPAL_CLIENT_ID',
    'PAYPAL_CLIENT_SECRET',
    'CAD_SERVICE_URL'
  ],
  cadService: [
    'REDIS_URL',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENCASCADE_PATH'
  ]
};

// File paths relative to project root
const envFilePaths = {
  web: 'apps/web/.env.local',
  api: 'apps/api/.env',
  cadService: 'apps/cad-service/.env'
};

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const env: Record<string, string> = {};

  const lineRegex = /^([^=]+)=(.*)$/;
  content.split('\n').forEach(line => {
    const match = lineRegex.exec(line);
    if (match) {
      const key = match[1].trim();
      env[key] = match[2].trim();
    }
  });

  return env;
}

function checkEnvironmentVariables(): boolean {
  const projectRoot = process.cwd();
  let allValid = true;
  const missingVars: Record<string, string[]> = {};

  Object.entries(envFilePaths).forEach(([service, relativePath]) => {
    const envPath = path.join(projectRoot, relativePath);
    const env = parseEnvFile(envPath);
    const combinedEnv = { ...env, ...process.env };
    const required = requiredEnvVars[service as keyof typeof requiredEnvVars];
    const missing = required.filter(key => !combinedEnv[key]);
    if (missing.length) {
      allValid = false;
      missingVars[service] = missing;
    }
  });

  if (!allValid) {
    console.log('Missing environment variables:\n');
    Object.entries(missingVars).forEach(([service, vars]) => {
      if (vars.length) {
        console.log(`- ${service}: ${vars.join(', ')}`);
      }
    });
    console.log('\nAdd them to the corresponding .env files before continuing.');
  }

  return allValid;
}

// Run the check and exit with appropriate code
const isValid = checkEnvironmentVariables();
process.exit(isValid ? 0 : 1);
