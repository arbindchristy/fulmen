function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export interface AppEnv {
  appVersion: string;
  databaseUrl: string;
  defaultRole: string;
  defaultTenantId: string;
  defaultUserId: string;
  environment: string;
  evidenceDir: string;
  port: number;
}

export function loadEnv(): AppEnv {
  return {
    appVersion: requireEnv('FULMEN_APP_VERSION', '0.1.0'),
    databaseUrl: requireEnv('DATABASE_URL'),
    defaultRole: requireEnv('FULMEN_DEV_DEFAULT_ROLE', 'operator'),
    defaultTenantId: requireEnv(
      'FULMEN_DEV_DEFAULT_TENANT_ID',
      '00000000-0000-0000-0000-000000000001',
    ),
    defaultUserId: requireEnv(
      'FULMEN_DEV_DEFAULT_USER_ID',
      '00000000-0000-0000-0000-000000000001',
    ),
    environment: requireEnv('FULMEN_ENV', 'development'),
    evidenceDir: requireEnv('FULMEN_EVIDENCE_DIR', 'tmp/evidence'),
    port: Number.parseInt(requireEnv('PORT', '4000'), 10),
  };
}
