import { Router } from 'express';

import { createChangeRequestInputSchema } from '@fulmen/contracts';

import type { ChangeRequestService } from './change-request-service.js';

export function createChangeRequestsRouter(
  changeRequestService: ChangeRequestService,
): Router {
  const router = Router();

  router.post('/api/v1/change-requests', async (request, response, next) => {
    try {
      const input = createChangeRequestInputSchema.parse(request.body);
      const preview = await changeRequestService.submitAndPreview(
        input,
        request.auth,
      );

      response.status(201).json(preview);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
