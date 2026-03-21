import type { GovernedPreviewResponse, CreateChangeRequestInput } from '@fulmen/contracts';
import type { AuditService } from '@fulmen/audit';
import type { Orchestrator } from '@fulmen/orchestrator';

import type { DevAuthContext } from '../auth/dev-auth.js';
import type { ChangeRequestRepository } from './change-request-repository.js';

export interface ChangeRequestService {
  submitAndPreview(
    input: CreateChangeRequestInput,
    context: DevAuthContext,
  ): Promise<GovernedPreviewResponse>;
}

interface ChangeRequestServiceDependencies {
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

      const previewReadyRequest =
        await dependencies.changeRequestRepository.markPreviewReady(
          submittedRequest.id,
          submittedRequest.tenantId,
        );

      const response: GovernedPreviewResponse = {
        ...preview,
        changeRequest: previewReadyRequest,
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
        },
      });

      return response;
    },
  };
}
