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
      environment: 'development',
      evidenceDir: 'tmp/evidence',
      port: 4000,
      webOrigin: 'http://localhost:3000',
    });

    const response = await request(app)
      .get('/healthz')
      .set('Origin', 'http://localhost:3000');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    );
  });
});
