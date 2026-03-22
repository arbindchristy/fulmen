import type {
  ApprovalDecisionInput,
  ApprovalRequestDetail,
  ApprovalRequestListItem,
  ApprovalRequestSummary,
  ApprovalStatus,
  ChangeRequest,
  GovernedActionPreview,
} from '@fulmen/contracts';
import type { AuditService } from '@fulmen/audit';

import { HttpError } from '../app/http-error.js';
import type { DevAuthContext } from '../auth/dev-auth.js';
import type { ChangeRequestRepository } from '../change-requests/change-request-repository.js';
import type { ApprovalRepository } from './approval-repository.js';

type ApprovalDecisionValue = Extract<ApprovalStatus, 'approved' | 'rejected'>;

export interface ApprovalService {
  createApprovalRequestsForActions(input: {
    tenantId: string;
    changeRequest: ChangeRequest;
    governedActions: GovernedActionPreview[];
  }): Promise<ApprovalRequestSummary[]>;
  listPendingApprovals(context: DevAuthContext): Promise<ApprovalRequestListItem[]>;
  getApprovalDetail(
    approvalRequestId: string,
    context: DevAuthContext,
  ): Promise<ApprovalRequestDetail>;
  approve(
    approvalRequestId: string,
    input: ApprovalDecisionInput,
    context: DevAuthContext,
  ): Promise<ApprovalRequestDetail>;
  reject(
    approvalRequestId: string,
    input: ApprovalDecisionInput,
    context: DevAuthContext,
  ): Promise<ApprovalRequestDetail>;
}

interface ApprovalServiceDependencies {
  approvalRepository: ApprovalRepository;
  auditService: AuditService;
  principalProvisioner: Pick<ChangeRequestRepository, 'ensurePrincipal'>;
}

export function createApprovalService(
  dependencies: ApprovalServiceDependencies,
): ApprovalService {
  return {
    async createApprovalRequestsForActions({
      tenantId,
      changeRequest,
      governedActions,
    }) {
      const approvalActions = governedActions.filter(
        (action) => action.approvalRequired,
      );

      if (approvalActions.length === 0) {
        return [];
      }

      const approvals = await dependencies.approvalRepository.createApprovalRequests(
        approvalActions.map((governedAction) => ({
          tenantId,
          changeRequest,
          governedAction,
          assignedRole: 'approver',
        })),
      );

      await Promise.all(
        approvals.map((approval) =>
          dependencies.auditService.record({
            tenantId,
            eventType: 'approval_request.created',
            entityType: 'approval_request',
            entityId: approval.id,
            actorType: 'system',
            actorId: 'orchestrator',
            payload: {
              changeRequestId: changeRequest.id,
              actionId: approval.actionId,
              assignedRole: approval.assignedRole,
              resourceRef: approval.resourceRef,
            },
          }),
        ),
      );

      return approvals;
    },

    async listPendingApprovals(context) {
      await dependencies.principalProvisioner.ensurePrincipal(context);
      assertCanViewApprovals(context);

      return dependencies.approvalRepository.listPendingApprovals(context.tenantId);
    },

    async getApprovalDetail(approvalRequestId, context) {
      await dependencies.principalProvisioner.ensurePrincipal(context);
      assertCanViewApprovals(context);

      const approval = await dependencies.approvalRepository.getApprovalDetail(
        approvalRequestId,
        context.tenantId,
      );

      if (!approval) {
        throw new HttpError(
          `Approval request ${approvalRequestId} was not found.`,
          404,
        );
      }

      return approval;
    },

    async approve(approvalRequestId, input, context) {
      return decideApproval(
        approvalRequestId,
        input,
        context,
        'approved',
        dependencies,
      );
    },

    async reject(approvalRequestId, input, context) {
      return decideApproval(
        approvalRequestId,
        input,
        context,
        'rejected',
        dependencies,
      );
    },
  };
}

async function decideApproval(
  approvalRequestId: string,
  input: ApprovalDecisionInput,
  context: DevAuthContext,
  decision: ApprovalDecisionValue,
  dependencies: ApprovalServiceDependencies,
): Promise<ApprovalRequestDetail> {
  await dependencies.principalProvisioner.ensurePrincipal(context);
  assertCanDecideApproval(context);

  const current = await dependencies.approvalRepository.getApprovalDetail(
    approvalRequestId,
    context.tenantId,
  );

  if (!current) {
    throw new HttpError(
      `Approval request ${approvalRequestId} was not found.`,
      404,
    );
  }

  if (!canActOnApproval(current, context)) {
    throw new HttpError(
      `User ${context.userId} with role ${context.role} cannot decide approval ${approvalRequestId}.`,
      403,
    );
  }

  if (current.status !== 'pending') {
    throw new HttpError(
      `Approval request ${approvalRequestId} is already ${current.status}.`,
      409,
    );
  }

  const updated = await dependencies.approvalRepository.recordApprovalDecision({
    approvalRequestId,
    tenantId: context.tenantId,
    actorId: context.userId,
    decision,
    justification: input.justification,
  });

  await dependencies.auditService.record({
    tenantId: context.tenantId,
    eventType:
      decision === 'approved'
        ? 'approval_request.approved'
        : 'approval_request.rejected',
    entityType: 'approval_request',
    entityId: approvalRequestId,
    actorType: 'user',
    actorId: context.userId,
    payload: {
      changeRequestId: updated.changeRequest.id,
      actionId: updated.action.id,
      decision,
      justification: input.justification,
      assignedRole: updated.assignedRole,
    },
  });

  return updated;
}

function assertCanViewApprovals(context: DevAuthContext): void {
  if (!['approver', 'admin'].includes(context.role)) {
    throw new HttpError(
      `Role ${context.role} is not allowed to view approvals.`,
      403,
    );
  }
}

function assertCanDecideApproval(context: DevAuthContext): void {
  if (!['approver', 'admin'].includes(context.role)) {
    throw new HttpError(
      `Role ${context.role} is not allowed to decide approvals.`,
      403,
    );
  }
}

function canActOnApproval(
  approval: ApprovalRequestDetail,
  context: DevAuthContext,
): boolean {
  if (context.role === 'admin') {
    return true;
  }

  if (approval.assignedUserId && approval.assignedUserId !== context.userId) {
    return false;
  }

  return approval.assignedRole === context.role;
}
