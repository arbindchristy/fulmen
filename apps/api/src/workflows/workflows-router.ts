import { Router } from 'express';

import { createChangeRequestInputSchema } from '@fulmen/contracts';
import type { Orchestrator } from '@fulmen/orchestrator';

export function createWorkflowsRouter(orchestrator: Orchestrator): Router {
  const router = Router();

  router.post('/api/v1/change-requests/preview', (request, response) => {
    const input = createChangeRequestInputSchema.parse(request.body);
    const preview = orchestrator.preview(input);

    response.status(200).json(preview);
  });

  return router;
}
