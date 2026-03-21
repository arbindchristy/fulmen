import { randomUUID } from 'node:crypto';

import type { ChangeRequest, CreateChangeRequestInput } from '@fulmen/contracts';
import type { DevAuthContext } from '../auth/dev-auth.js';
import type { Pool, QueryResultRow } from 'pg';

export interface ChangeRequestRepository {
  ensurePrincipal(context: DevAuthContext): Promise<void>;
  createSubmittedChangeRequest(
    input: CreateChangeRequestInput,
    context: DevAuthContext,
  ): Promise<ChangeRequest>;
  markPreviewReady(id: string, tenantId: string): Promise<ChangeRequest>;
}

export class PostgresChangeRequestRepository
  implements ChangeRequestRepository
{
  constructor(private readonly pool: Pool) {}

  async ensurePrincipal(context: DevAuthContext): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO tenants (id, name, status)
        VALUES ($1, $2, 'active')
        ON CONFLICT (id) DO NOTHING
      `,
      [context.tenantId, `Local tenant ${context.tenantId.slice(0, 8)}`],
    );

    await this.pool.query(
      `
        INSERT INTO users (
          id,
          tenant_id,
          external_subject,
          email,
          display_name,
          status
        )
        VALUES ($1, $2, $3, $4, $5, 'active')
        ON CONFLICT (id) DO UPDATE SET
          tenant_id = EXCLUDED.tenant_id,
          external_subject = EXCLUDED.external_subject,
          email = EXCLUDED.email,
          display_name = EXCLUDED.display_name
      `,
      [
        context.userId,
        context.tenantId,
        `dev-subject-${context.userId}`,
        `${context.userId}@local.fulmen.test`,
        `Dev User ${context.userId.slice(0, 8)}`,
      ],
    );

    const roleResult = await this.pool.query<{ id: string }>(
      `
        INSERT INTO roles (tenant_id, name, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (tenant_id, name) DO UPDATE SET
          description = EXCLUDED.description
        RETURNING id
      `,
      [
        context.tenantId,
        context.role,
        `Local development role for ${context.role}.`,
      ],
    );

    const roleId = roleResult.rows[0]?.id;

    if (!roleId) {
      throw new Error(`Failed to resolve role ${context.role} for tenant ${context.tenantId}.`);
    }

    await this.pool.query(
      `
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, role_id) DO NOTHING
      `,
      [context.userId, roleId],
    );
  }

  async createSubmittedChangeRequest(
    input: CreateChangeRequestInput,
    context: DevAuthContext,
  ): Promise<ChangeRequest> {
    const requestKey = `cr-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const changeRequestId = randomUUID();

    await this.pool.query(
      `
        INSERT INTO change_requests (
          id,
          tenant_id,
          request_key,
          title,
          description,
          rationale,
          requested_by,
          risk_level,
          status,
          scheduled_start_at,
          scheduled_end_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          'submitted',
          $9,
          $10
        )
      `,
      [
        changeRequestId,
        context.tenantId,
        requestKey,
        input.title,
        input.description,
        input.rationale,
        context.userId,
        input.riskLevel,
        input.requestedWindow?.startAt ?? null,
        input.requestedWindow?.endAt ?? null,
      ],
    );

    await this.pool.query(
      `
        INSERT INTO change_request_targets (
          change_request_id,
          target_type,
          target_ref,
          environment
        )
        VALUES ($1, 'system', $2, $3)
      `,
      [changeRequestId, input.targetRef, input.environment],
    );

    return this.getById(changeRequestId, context.tenantId);
  }

  async markPreviewReady(id: string, tenantId: string): Promise<ChangeRequest> {
    await this.pool.query(
      `
        UPDATE change_requests
        SET status = 'preview_ready'
        WHERE id = $1 AND tenant_id = $2
      `,
      [id, tenantId],
    );

    return this.getById(id, tenantId);
  }

  private async getById(id: string, tenantId: string): Promise<ChangeRequest> {
    const result = await this.pool.query(
      `
        SELECT
          cr.id,
          cr.tenant_id AS "tenantId",
          cr.request_key AS "requestKey",
          cr.title,
          cr.description,
          cr.rationale,
          cr.risk_level AS "riskLevel",
          cr.status,
          crt.target_ref AS "targetRef",
          crt.environment,
          cr.requested_by AS "requestedBy",
          cr.scheduled_start_at AS "requestedWindowStart",
          cr.scheduled_end_at AS "requestedWindowEnd",
          cr.created_at AS "createdAt"
        FROM change_requests cr
        INNER JOIN change_request_targets crt
          ON crt.change_request_id = cr.id
        WHERE cr.id = $1 AND cr.tenant_id = $2
      `,
      [id, tenantId],
    );

    return mapChangeRequestRow(result.rows[0]);
  }
}

function mapChangeRequestRow(row: QueryResultRow): ChangeRequest {
  const requestedWindow =
    row.requestedWindowStart || row.requestedWindowEnd
      ? {
          startAt: row.requestedWindowStart
            ? new Date(row.requestedWindowStart).toISOString()
            : undefined,
          endAt: row.requestedWindowEnd
            ? new Date(row.requestedWindowEnd).toISOString()
            : undefined,
        }
      : undefined;

  return {
    id: row.id,
    tenantId: row.tenantId,
    requestKey: row.requestKey,
    title: row.title,
    description: row.description,
    rationale: row.rationale,
    riskLevel: row.riskLevel,
    status: row.status,
    targetRef: row.targetRef,
    environment: row.environment,
    requestedBy: row.requestedBy,
    requestedWindow,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}
