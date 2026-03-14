import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app/create-app.js';

describe('@fulmen/api health route', () => {
  it('returns an ok health payload', async () => {
    const app = createApp({
      appVersion: '0.1.0',
      databaseUrl: 'postgres://example/example',
      defaultRole: 'operator',
      defaultTenantId: '00000000-0000-0000-0000-000000000001',
      defaultUserId: '00000000-0000-0000-0000-000000000001',
      environment: 'test',
      evidenceDir: 'tmp/evidence',
      port: 4000,
    });

    const response = await request(app).get('/healthz');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
