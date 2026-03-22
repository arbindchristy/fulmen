import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { AuditService } from '@fulmen/audit';
import type { GovernedPreviewResponse } from '@fulmen/contracts';
import type { Orchestrator } from '@fulmen/orchestrator';

import type { ApprovalService } from '../src/approvals/approval-service.js';
import { createChangeRequestService } from '../src/change-requests/change-request-service.js';
import type { ChangeRequestRepository } from '../src/change-requests/change-request-repository.js';

describe('@fulmen/api change request service', () => {
  it('submits a change request, emits audit events, and returns a preview-ready response', async () => {
    const principalCalls: string[] = [];
    const auditEvents: string[] = [];

    const repository: ChangeRequestRepository = {
      async ensurePrincipal(context) {
        principalCalls.push(context.userId);
      },
      async createSubmittedChangeRequest(_input, context) {
        return {
          id: '00000000-0000-0000-0000-000000000111',
          tenantId: context.tenantId,
          requestKey: 'cr-001',
          title: 'Restart edge router',
          description: 'Restart router-01 during the next maintenance window.',
          rationale: 'Recover from a failed routing daemon.',
          riskLevel: 'high',
          status: 'submitted',
          targetRef: 'router-01',
          environment: 'production',
          requestedBy: context.userId,
          requestedWindow: {
            startAt: '2026-03-22T01:00:00.000Z',
            endAt: '2026-03-22T02:00:00.000Z',
          },
          createdAt: '2026-03-21T12:00:00.000Z',
        };
      },
      async updateStatus(id, tenantId, status) {
        return {
          id,
          tenantId,
          requestKey: 'cr-001',
          title: 'Restart edge router',
          description: 'Restart router-01 during the next maintenance window.',
          rationale: 'Recover from a failed routing daemon.',
          riskLevel: 'high',
          status,
          targetRef: 'router-01',
          environment: 'production',
          requestedBy: '00000000-0000-0000-0000-000000000010',
          requestedWindow: {
            startAt: '2026-03-22T01:00:00.000Z',
            endAt: '2026-03-22T02:00:00.000Z',
          },
          createdAt: '2026-03-21T12:00:00.000Z',
        };
      },
    };

    const approvalService: Pick<
      ApprovalService,
      'createApprovalRequestsForActions'
    > = {
      async createApprovalRequestsForActions() {
        return [
          {
            id: '00000000-0000-0000-0000-000000000211',
            tenantId: '00000000-0000-0000-0000-000000000001',
            changeRequestId: '00000000-0000-0000-0000-000000000111',
            status: 'pending',
            assignedRole: 'approver',
            assignedUserId: null,
            actionId: 'execute-change',
            actionTitle: 'Apply the requested change',
            actionSummary: 'Restart router-01 during the approved window.',
            actionType: 'change.execute',
            resourceRef: 'router-01',
            createdAt: '2026-03-21T12:05:00.000Z',
          },
        ];
      },
    };

    const auditService: Pick<AuditService, 'record'> = {
      async record(event) {
        auditEvents.push(event.eventType);

        return {
          id: randomUUID(),
          tenantId: event.tenantId,
          eventType: event.eventType,
          entityType: event.entityType,
          entityId: event.entityId,
          actorType: event.actorType,
          actorId: event.actorId,
          occurredAt: new Date().toISOString(),
          payload: event.payload ?? {},
        };
      },
    };

    const orchestrator: Pick<Orchestrator, 'preview'> = {
      async preview({ changeRequest }): Promise<GovernedPreviewResponse> {
        return {
          changeRequest,
          normalizedRequest: {
            title: changeRequest.title,
            changeCategory: 'network',
            targetRef: changeRequest.targetRef,
            environment: changeRequest.environment,
            requestedOutcome: 'Restart router-01 cleanly.',
            rationale: changeRequest.rationale,
            operatorIntentSummary:
              'Apply the requested change to router-01 in production.',
            assumptions: ['A maintenance window has been proposed.'],
            missingInformation: [],
            requestedWindow: changeRequest.requestedWindow,
          },
          actionPlan: {
            planId: 'plan-router-01',
            summary: 'Validate, execute, and verify the requested change.',
            actions: [
              {
                id: 'execute-change',
                kind: 'execution',
                title: 'Apply the requested change',
                actionType: 'change.execute',
                resourceRef: changeRequest.targetRef,
                summary: 'Restart router-01 during the approved window.',
                rationale: 'Production restart requested by the operator.',
              },
            ],
          },
          governedActions: [
            {
              action: {
                id: 'execute-change',
                kind: 'execution',
                title: 'Apply the requested change',
                actionType: 'change.execute',
                resourceRef: changeRequest.targetRef,
                summary: 'Restart router-01 during the approved window.',
                rationale: 'Production restart requested by the operator.',
              },
              riskAssessment: {
                actionId: 'execute-change',
                riskLevel: 'high',
                posture: 'review',
                summary: 'This action changes a production router.',
                factors: ['Production environment', 'High-risk request'],
              },
              policyDecision: {
                actionType: 'change.execute',
                resourceRef: changeRequest.targetRef,
                decision: 'require_approval',
                reasonCode: 'policy.require-approval-high-risk-execution',
                explanation: 'High-risk change requires approval.',
              },
              approvalRequired: true,
            },
          ],
          previewSummary:
            'Preview prepared with one action requiring approval before execution.',
        };
      },
    };

    const service = createChangeRequestService({
      approvalService: approvalService as ApprovalService,
      auditService: auditService as AuditService,
      changeRequestRepository: repository,
      orchestrator: orchestrator as Orchestrator,
    });

    const preview = await service.submitAndPreview(
      {
        title: 'Restart edge router',
        description: 'Restart router-01 during the next maintenance window.',
        rationale: 'Recover from a failed routing daemon.',
        riskLevel: 'high',
        targetRef: 'router-01',
        environment: 'production',
        requestedWindow: {
          startAt: '2026-03-22T01:00:00.000Z',
          endAt: '2026-03-22T02:00:00.000Z',
        },
      },
      {
        userId: '00000000-0000-0000-0000-000000000010',
        tenantId: '00000000-0000-0000-0000-000000000001',
        role: 'operator',
      },
    );

    expect(principalCalls).toEqual(['00000000-0000-0000-0000-000000000010']);
    expect(preview.changeRequest.status).toBe('in_review');
    expect(preview.governedActions[0]!.approvalRequired).toBe(true);
    expect(preview.governedActions[0]!.approvalRequest?.id).toBe(
      '00000000-0000-0000-0000-000000000211',
    );
    expect(auditEvents).toEqual([
      'change_request.submitted',
      'change_request.preview_generated',
    ]);
  });
});
