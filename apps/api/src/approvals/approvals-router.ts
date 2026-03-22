import { Router } from 'express';

import { approvalDecisionInputSchema } from '@fulmen/contracts';

import type { ApprovalService } from './approval-service.js';

export function createApprovalsRouter(approvalService: ApprovalService): Router {
  const router = Router();

  router.get('/api/v1/approvals', async (request, response, next) => {
    try {
      const approvals = await approvalService.listPendingApprovals(request.auth);
      response.status(200).json(approvals);
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/v1/approvals/:approvalRequestId', async (request, response, next) => {
    try {
      const approval = await approvalService.getApprovalDetail(
        request.params.approvalRequestId,
        request.auth,
      );
      response.status(200).json(approval);
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/v1/approvals/:approvalRequestId/approve', async (request, response, next) => {
    try {
      const input = approvalDecisionInputSchema.parse(request.body);
      const approval = await approvalService.approve(
        request.params.approvalRequestId,
        input,
        request.auth,
      );
      response.status(200).json(approval);
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/v1/approvals/:approvalRequestId/reject', async (request, response, next) => {
    try {
      const input = approvalDecisionInputSchema.parse(request.body);
      const approval = await approvalService.reject(
        request.params.approvalRequestId,
        input,
        request.auth,
      );
      response.status(200).json(approval);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
