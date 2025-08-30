import * as fs from 'fs';
import * as path from 'path';

// Required environment variables for each service
const requiredEnvVars = {
  web: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
  ],
  api: [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'REDIS_URL',
    'STRIPE_SECRET_KEY',
    'PAYPAL_CLIENT_ID',
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

  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
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
  let missingVars: Record<string, string[]> = {};

  // Check each service
  Object.entries(envFilePaths).forEach(([service, relativePath]) => {
    const envPath = path.join(projectRoot, relativePath);
    const env = parseEnvFile(envPath);
    
    // Check process.env as well for environment variables
    const combinedEnv = { ...env, ...process.env };
    
    const missing = requiredEnvVars[service as keyof typeof requiredEnvVars]
      .filter(key => !combinedEnv[key]);

    if (missing.length > 0) {
      allValid = false;
      missingVars[service] = missing;
    }
  });

  // Print results
  console.log('🔍 Environment Variables Check\n');

  if (allValid) {
    console.log('✅ All required environment variables are present.\n');
  } else {
    console.log('❌ Missing environment variables:\n');
    
    Object.entries(missingVars).forEach(([service, vars]) => {
      if (vars.length > 0) {
        console.log(`[${service.toUpperCase()}] Missing variables:`);
        vars.forEach(v => console.log(`  - ${v}`));
        console.log();
      }
    });

    console.log('Please add the missing environment variables to the respective .env files:');
    console.log('- Web:         apps/web/.env.local');
    console.log('- API:         apps/api/.env');
    console.log('- CAD Service: apps/cad-service/.env\n');
  }

  return allValid;
}

// Run the check and exit with appropriate code
const isValid = checkEnvironmentVariables();
process.exit(isValid ? 0 : 1);
