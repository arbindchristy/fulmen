import { Router } from 'express';

export function createAuditRouter(): Router {
  const router = Router();

  router.get('/api/v1/audit-events', (_request, response) => {
    response.status(501).json({
      message: 'Audit read APIs are scaffolded but not implemented yet.',
    });
  });

  return router;
}
