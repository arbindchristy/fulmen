import type { Request, Response } from 'express';
import { describe, expect, it } from 'vitest';

import { createHealthRouter } from '../src/health/health-router.js';

describe('@fulmen/api health route', () => {
  it('returns an ok health payload', () => {
    const router = createHealthRouter({
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

    const routeLayer = router.stack.find((layer) => layer.route?.path === '/healthz');
    const handler = routeLayer?.route?.stack[0]?.handle;
    const response = {
      jsonPayload: null as unknown,
      json(payload: unknown) {
        this.jsonPayload = payload;
      },
    };

    handler?.({} as Request, response as unknown as Response, () => undefined);

    expect(response.jsonPayload).toMatchObject({
      status: 'ok',
      service: 'fulmen-api',
      environment: 'development',
      version: '0.1.0',
    });
  });
});
