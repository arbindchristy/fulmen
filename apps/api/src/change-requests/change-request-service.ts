import type { GovernedPreviewResponse, CreateChangeRequestInput } from '@fulmen/contracts';
import type { AuditService } from '@fulmen/audit';
import type { Orchestrator } from '@fulmen/orchestrator';

import type { DevAuthContext } from '../auth/dev-auth.js';
import type { ApprovalService } from '../approvals/approval-service.js';
import type { ChangeRequestRepository } from './change-request-repository.js';

export interface ChangeRequestService {
  submitAndPreview(
    input: CreateChangeRequestInput,
    context: DevAuthContext,
  ): Promise<GovernedPreviewResponse>;
}

interface ChangeRequestServiceDependencies {
  approvalService: ApprovalService;
  auditService: AuditService;
  changeRequestRepository: ChangeRequestRepository;
  orchestrator: Orchestrator;
}

export function createChangeRequestService(
  dependencies: ChangeRequestServiceDependencies,
): ChangeRequestService {
  return {
    async submitAndPreview(input, context) {
      await dependencies.changeRequestRepository.ensurePrincipal(context);

      const submittedRequest =
        await dependencies.changeRequestRepository.createSubmittedChangeRequest(
          input,
          context,
        );

      await dependencies.auditService.record({
        tenantId: context.tenantId,
        eventType: 'change_request.submitted',
        entityType: 'change_request',
        entityId: submittedRequest.id,
        actorType: 'user',
        actorId: context.userId,
        payload: {
          requestKey: submittedRequest.requestKey,
          riskLevel: submittedRequest.riskLevel,
          targetRef: submittedRequest.targetRef,
          environment: submittedRequest.environment,
        },
      });

      const preview = await dependencies.orchestrator.preview({
        changeRequest: submittedRequest,
        submission: input,
      });

      const createdApprovals =
        await dependencies.approvalService.createApprovalRequestsForActions({
          tenantId: submittedRequest.tenantId,
          changeRequest: submittedRequest,
          governedActions: preview.governedActions,
        });

      const approvalsByActionId = new Map(
        createdApprovals.map((approval) => [approval.actionId, approval]),
      );

      const requestWithApprovalState =
        await dependencies.changeRequestRepository.updateStatus(
          submittedRequest.id,
          submittedRequest.tenantId,
          createdApprovals.length > 0 ? 'in_review' : 'preview_ready',
        );

      const response: GovernedPreviewResponse = {
        ...preview,
        changeRequest: requestWithApprovalState,
        governedActions: preview.governedActions.map((action) => ({
          ...action,
          approvalRequest: approvalsByActionId.get(action.action.id) ?? null,
        })),
      };

      await dependencies.auditService.record({
        tenantId: context.tenantId,
        eventType: 'change_request.preview_generated',
        entityType: 'change_request',
        entityId: submittedRequest.id,
        actorType: 'system',
        actorId: 'orchestrator',
        payload: {
          actionCount: response.governedActions.length,
          approvalRequiredActions: response.governedActions
            .filter((action) => action.approvalRequired)
            .map((action) => action.action.id),
          createdApprovalRequestIds: createdApprovals.map((approval) => approval.id),
        },
      });

      return response;
    },
  };
}
