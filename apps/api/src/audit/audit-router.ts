import { Router } from 'express';

import type { AuditService } from '@fulmen/audit';

export function createAuditRouter(auditService: AuditService): Router {
  const router = Router();

  router.get('/api/v1/audit-events', async (request, response, next) => {
    try {
      const limit = request.query.limit
        ? Number.parseInt(String(request.query.limit), 10)
        : undefined;
      const events = await auditService.listRecent({
        tenantId: request.auth.tenantId,
        limit,
        entityId:
          typeof request.query.entityId === 'string'
            ? request.query.entityId
            : undefined,
      });

      response.status(200).json(events);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
