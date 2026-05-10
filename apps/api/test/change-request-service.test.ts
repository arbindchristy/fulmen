import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { AuditService } from '@fulmen/audit';
import type { GovernedPreviewResponse } from '@fulmen/contracts';
import type { Orchestrator } from '@fulmen/orchestrator';

import type { ApprovalService } from '../src/approvals/approval-service.js';
import { createChangeRequestService } from '../src/change-requests/change-request-service.js';
import type { ChangeRequestRepository } from '../src/change-requests/change-request-repository.js';

describe('@fulmen/api change request service', () => {
  it('submits an evidence cycle, emits audit events, and returns an in-review response', async () => {
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
          title: 'Quarterly access review evidence pack',
          controlFamily: 'Access Governance',
          framework: 'SOC 2 CC6.2',
          description: 'Collect evidence for privileged access review completion.',
          rationale: 'Produce an audit-ready evidence pack.',
          businessOwner: 'Head of Identity Operations',
          sourceSystems: ['Okta', 'Jira'],
          riskLevel: 'high',
          status: 'submitted',
          targetRef: 'UGR-ACCESS-01',
          environment: 'Global identity operations',
          requestedBy: context.userId,
          requestedWindow: {
            startAt: '2026-05-01T00:00:00.000Z',
            endAt: '2026-05-31T23:59:00.000Z',
          },
          createdAt: '2026-05-10T12:00:00.000Z',
        };
      },
      async updateStatus(id, tenantId, status) {
        return {
          id,
          tenantId,
          requestKey: 'cr-001',
          title: 'Quarterly access review evidence pack',
          controlFamily: 'Access Governance',
          framework: 'SOC 2 CC6.2',
          description: 'Collect evidence for privileged access review completion.',
          rationale: 'Produce an audit-ready evidence pack.',
          businessOwner: 'Head of Identity Operations',
          sourceSystems: ['Okta', 'Jira'],
          riskLevel: 'high',
          status,
          targetRef: 'UGR-ACCESS-01',
          environment: 'Global identity operations',
          requestedBy: '00000000-0000-0000-0000-000000000010',
          requestedWindow: {
            startAt: '2026-05-01T00:00:00.000Z',
            endAt: '2026-05-31T23:59:00.000Z',
          },
          createdAt: '2026-05-10T12:00:00.000Z',
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
            actionId: 'adjudicate-gaps',
            actionTitle: 'Adjudicate evidence gaps and compensating explanations',
            actionSummary: 'Route unresolved gaps through governed review.',
            actionType: 'evidence.exception_review',
            resourceRef: 'UGR-ACCESS-01',
            createdAt: '2026-05-10T12:05:00.000Z',
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
            controlFamily: changeRequest.controlFamily,
            framework: changeRequest.framework,
            targetRef: changeRequest.targetRef,
            environment: changeRequest.environment,
            businessOwner: changeRequest.businessOwner,
            sourceSystems: changeRequest.sourceSystems,
            requestedOutcome:
              'Collect evidence for privileged access review completion for SOC 2 CC6.2 control UGR-ACCESS-01.',
            rationale: changeRequest.rationale,
            operatorIntentSummary:
              'Prepare a governed evidence pack for Access Governance control UGR-ACCESS-01 in Global identity operations.',
            expectedArtifacts: ['Okta export', 'Jira approvals'],
            assumptions: ['A bounded evidence collection period has been declared.'],
            missingInformation: [],
            requestedWindow: changeRequest.requestedWindow,
          },
          actionPlan: {
            planId: 'plan-ugr-access-01',
            summary: 'Collect, reconcile, narrate, and adjudicate evidence.',
            actions: [
              {
                id: 'adjudicate-gaps',
                kind: 'adjudication',
                title: 'Adjudicate evidence gaps and compensating explanations',
                actionType: 'evidence.exception_review',
                resourceRef: changeRequest.targetRef,
                summary: 'Route unresolved gaps through governed review.',
                rationale: 'Gap acceptance is the trust boundary.',
              },
            ],
          },
          governedActions: [
            {
              action: {
                id: 'adjudicate-gaps',
                kind: 'adjudication',
                title: 'Adjudicate evidence gaps and compensating explanations',
                actionType: 'evidence.exception_review',
                resourceRef: changeRequest.targetRef,
                summary: 'Route unresolved gaps through governed review.',
                rationale: 'Gap acceptance is the trust boundary.',
              },
              riskAssessment: {
                actionId: 'adjudicate-gaps',
                riskLevel: 'high',
                posture: 'review',
                summary: 'This action accepts unresolved evidence gaps.',
                factors: ['Evidence sensitivity: high.', 'Open intake gaps remain.'],
              },
              policyDecision: {
                actionType: 'evidence.exception_review',
                resourceRef: changeRequest.targetRef,
                decision: 'require_approval',
                reasonCode: 'policy.require-approval-high-sensitivity-exception',
                explanation: 'High-sensitivity evidence exception requires approval.',
              },
              approvalRequired: true,
              approvalRequest: null,
              approvalDecision: null,
            },
          ],
          evidencePack: {
            coverageSummary: '2 of 3 artifacts are audit-ready.',
            narrativeDraft: 'Draft narrative ready for reviewer inspection.',
            artifacts: [
              {
                id: 'artifact-1',
                system: 'Okta',
                artifactType: 'system-export',
                title: 'Okta control evidence',
                description: 'System-generated evidence extract from Okta.',
                status: 'ready',
                freshness: 'current',
                provenance: 'Connector snapshot captured from Okta.',
              },
            ],
            gaps: [
              {
                id: 'gap-1',
                severity: 'high',
                title: 'Owner attestation is not audit-ready',
                summary: 'Owner attestation still needs stronger provenance.',
                remediation: 'Collect a reviewer-acceptable attestation.',
                approvalRequired: true,
              },
            ],
            followUps: ['Collect a reviewer-acceptable attestation.'],
          },
          previewSummary:
            'Evidence pack prepared with 1 high-severity gap and 1 governed review action requiring approval.',
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
        title: 'Quarterly access review evidence pack',
        controlFamily: 'Access Governance',
        framework: 'SOC 2 CC6.2',
        description: 'Collect evidence for privileged access review completion.',
        rationale: 'Produce an audit-ready evidence pack.',
        businessOwner: 'Head of Identity Operations',
        sourceSystems: ['Okta', 'Jira'],
        riskLevel: 'high',
        targetRef: 'UGR-ACCESS-01',
        environment: 'Global identity operations',
        requestedWindow: {
          startAt: '2026-05-01T00:00:00.000Z',
          endAt: '2026-05-31T23:59:00.000Z',
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
    expect(preview.evidencePack.gaps).toHaveLength(1);
    expect(preview.governedActions[0]!.approvalRequest?.id).toBe(
      '00000000-0000-0000-0000-000000000211',
    );
    expect(auditEvents).toEqual([
      'evidence_cycle.submitted',
      'evidence_cycle.preview_generated',
    ]);
  });
});
