import { randomUUID } from 'node:crypto';

import type {
  ApprovalDecisionInput,
  ApprovalRequestDetail,
  ApprovalRequestListItem,
  ApprovalRequestSummary,
  ApprovalStatus,
  ChangeRequest,
  GovernedActionPreview,
} from '@fulmen/contracts';
import type { Pool, QueryResultRow } from 'pg';

interface CreateApprovalRequestInput {
  tenantId: string;
  changeRequest: ChangeRequest;
  governedAction: GovernedActionPreview;
  assignedRole: string;
}

interface RecordApprovalDecisionInput {
  approvalRequestId: string;
  tenantId: string;
  actorId: string;
  decision: Extract<ApprovalStatus, 'approved' | 'rejected'>;
  justification: ApprovalDecisionInput['justification'];
}

export interface ApprovalRepository {
  createApprovalRequests(
    input: CreateApprovalRequestInput[],
  ): Promise<ApprovalRequestSummary[]>;
  listPendingApprovals(tenantId: string): Promise<ApprovalRequestListItem[]>;
  getApprovalDetail(
    approvalRequestId: string,
    tenantId: string,
  ): Promise<ApprovalRequestDetail | null>;
  recordApprovalDecision(
    input: RecordApprovalDecisionInput,
  ): Promise<ApprovalRequestDetail>;
}

export class PostgresApprovalRepository implements ApprovalRepository {
  constructor(private readonly pool: Pool) {}

  async createApprovalRequests(
    inputs: CreateApprovalRequestInput[],
  ): Promise<ApprovalRequestSummary[]> {
    const approvals: ApprovalRequestSummary[] = [];

    for (const input of inputs) {
      const approvalRequestId = randomUUID();

      const result = await this.pool.query(
        `
          INSERT INTO approval_requests (
            id,
            tenant_id,
            change_request_id,
            run_id,
            policy_decision_id,
            status,
            assigned_role,
            assigned_user_id,
            action_id,
            action_title,
            action_summary,
            action_type,
            resource_ref,
            action_json,
            policy_decision_json,
            risk_assessment_json
          )
          VALUES (
            $1,
            $2,
            $3,
            NULL,
            NULL,
            'pending',
            $4,
            NULL,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10::jsonb,
            $11::jsonb,
            $12::jsonb
          )
          RETURNING
            id,
            tenant_id AS "tenantId",
            change_request_id AS "changeRequestId",
            status,
            assigned_role AS "assignedRole",
            assigned_user_id AS "assignedUserId",
            action_id AS "actionId",
            action_title AS "actionTitle",
            action_summary AS "actionSummary",
            action_type AS "actionType",
            resource_ref AS "resourceRef",
            created_at AS "createdAt"
        `,
        [
          approvalRequestId,
          input.tenantId,
          input.changeRequest.id,
          input.assignedRole,
          input.governedAction.action.id,
          input.governedAction.action.title,
          input.governedAction.action.summary,
          input.governedAction.action.actionType,
          input.governedAction.action.resourceRef,
          JSON.stringify(input.governedAction.action),
          JSON.stringify(input.governedAction.policyDecision),
          JSON.stringify(input.governedAction.riskAssessment),
        ],
      );

      approvals.push(mapApprovalSummary(result.rows[0]));
    }

    return approvals;
  }

  async listPendingApprovals(tenantId: string): Promise<ApprovalRequestListItem[]> {
    const result = await this.pool.query(
      `
        SELECT
          ar.id,
          ar.tenant_id AS "tenantId",
          ar.change_request_id AS "changeRequestId",
          ar.status,
          ar.assigned_role AS "assignedRole",
          ar.assigned_user_id AS "assignedUserId",
          ar.action_id AS "actionId",
          ar.action_title AS "actionTitle",
          ar.action_summary AS "actionSummary",
          ar.action_type AS "actionType",
          ar.resource_ref AS "resourceRef",
          ar.created_at AS "createdAt",
          cr.title AS "changeRequestTitle",
          cr.request_key AS "requestKey",
          cr.requested_by AS "requestedBy"
        FROM approval_requests ar
        INNER JOIN change_requests cr
          ON cr.id = ar.change_request_id
        WHERE ar.tenant_id = $1
          AND ar.status = 'pending'
        ORDER BY ar.created_at ASC
      `,
      [tenantId],
    );

    return result.rows.map(mapApprovalListItem);
  }

  async getApprovalDetail(
    approvalRequestId: string,
    tenantId: string,
  ): Promise<ApprovalRequestDetail | null> {
    const result = await this.pool.query(
      `
        SELECT
          ar.id,
          ar.tenant_id AS "tenantId",
          ar.change_request_id AS "changeRequestId",
          ar.status,
          ar.assigned_role AS "assignedRole",
          ar.assigned_user_id AS "assignedUserId",
          ar.action_id AS "actionId",
          ar.action_title AS "actionTitle",
          ar.action_summary AS "actionSummary",
          ar.action_type AS "actionType",
          ar.resource_ref AS "resourceRef",
          ar.action_json AS "actionJson",
          ar.policy_decision_json AS "policyDecisionJson",
          ar.risk_assessment_json AS "riskAssessmentJson",
          ar.created_at AS "createdAt",
          cr.id AS "requestId",
          cr.request_key AS "requestKey",
          cr.title AS "changeRequestTitle",
          cr.description AS "changeRequestDescription",
          cr.rationale AS "changeRequestRationale",
          cr.risk_level AS "changeRequestRiskLevel",
          crt.target_ref AS "targetRef",
          crt.environment,
          cr.requested_by AS "requestedBy",
          cr.created_at AS "changeRequestCreatedAt",
          ad.decision AS "decisionValue",
          ad.decided_by AS "decidedBy",
          ad.justification,
          ad.decided_at AS "decidedAt"
        FROM approval_requests ar
        INNER JOIN change_requests cr
          ON cr.id = ar.change_request_id
        INNER JOIN change_request_targets crt
          ON crt.change_request_id = cr.id
        LEFT JOIN approval_decisions ad
          ON ad.approval_request_id = ar.id
        WHERE ar.id = $1
          AND ar.tenant_id = $2
        ORDER BY ad.decided_at DESC NULLS LAST
        LIMIT 1
      `,
      [approvalRequestId, tenantId],
    );

    const row = result.rows[0];

    return row ? mapApprovalDetail(row) : null;
  }

  async recordApprovalDecision(
    input: RecordApprovalDecisionInput,
  ): Promise<ApprovalRequestDetail> {
    const approval = await this.getApprovalDetail(
      input.approvalRequestId,
      input.tenantId,
    );

    if (!approval) {
      throw new Error(`Approval request ${input.approvalRequestId} was not found.`);
    }

    if (approval.status !== 'pending') {
      throw new Error(
        `Approval request ${input.approvalRequestId} is already ${approval.status}.`,
      );
    }

    await this.pool.query(
      `
        UPDATE approval_requests
        SET status = $3
        WHERE id = $1 AND tenant_id = $2
      `,
      [input.approvalRequestId, input.tenantId, input.decision],
    );

    await this.pool.query(
      `
        INSERT INTO approval_decisions (
          id,
          approval_request_id,
          decided_by,
          decision,
          justification
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        randomUUID(),
        input.approvalRequestId,
        input.actorId,
        input.decision,
        input.justification,
      ],
    );

    const updated = await this.getApprovalDetail(
      input.approvalRequestId,
      input.tenantId,
    );

    if (!updated) {
      throw new Error(
        `Approval request ${input.approvalRequestId} disappeared after update.`,
      );
    }

    return updated;
  }
}

function mapApprovalSummary(row: QueryResultRow): ApprovalRequestSummary {
  return {
    id: row.id,
    tenantId: row.tenantId,
    changeRequestId: row.changeRequestId,
    status: row.status,
    assignedRole: row.assignedRole,
    assignedUserId: row.assignedUserId ?? null,
    actionId: row.actionId,
    actionTitle: row.actionTitle,
    actionSummary: row.actionSummary,
    actionType: row.actionType,
    resourceRef: row.resourceRef,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

function mapApprovalListItem(row: QueryResultRow): ApprovalRequestListItem {
  return {
    ...mapApprovalSummary(row),
    changeRequestTitle: row.changeRequestTitle,
    requestKey: row.requestKey,
    requestedBy: row.requestedBy,
  };
}

function mapApprovalDetail(row: QueryResultRow): ApprovalRequestDetail {
  return {
    ...mapApprovalSummary(row),
    changeRequest: {
      id: row.requestId,
      requestKey: row.requestKey,
      title: row.changeRequestTitle,
      description: row.changeRequestDescription,
      rationale: row.changeRequestRationale,
      riskLevel: row.changeRequestRiskLevel,
      targetRef: row.targetRef,
      environment: row.environment,
      requestedBy: row.requestedBy,
      createdAt: new Date(row.changeRequestCreatedAt).toISOString(),
    },
    action: row.actionJson,
    policyDecision: row.policyDecisionJson,
    riskAssessment: row.riskAssessmentJson,
    decision: row.decisionValue
      ? {
          decision: row.decisionValue,
          decidedBy: row.decidedBy,
          justification: row.justification,
          decidedAt: new Date(row.decidedAt).toISOString(),
        }
      : null,
  };
}
