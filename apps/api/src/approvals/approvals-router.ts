import { Router } from 'express';

export function createApprovalsRouter(): Router {
  const router = Router();

  router.get('/api/v1/approvals', (_request, response) => {
    response.status(501).json({
      message: 'Approval APIs are scaffolded but not implemented yet.',
    });
  });

  return router;
}
