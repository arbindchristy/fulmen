import type { AuditEvent } from '@fulmen/contracts';
import type { AuditEventStore } from '@fulmen/audit';
import type { Pool } from 'pg';

export class PostgresAuditEventStore implements AuditEventStore {
  constructor(private readonly pool: Pool) {}

  async append(event: AuditEvent): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO audit_events (
          id,
          tenant_id,
          event_type,
          entity_type,
          entity_id,
          actor_type,
          actor_id,
          occurred_at,
          payload_json
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      `,
      [
        event.id,
        event.tenantId,
        event.eventType,
        event.entityType,
        event.entityId,
        event.actorType,
        event.actorId,
        event.occurredAt,
        JSON.stringify(event.payload),
      ],
    );
  }

  async listRecent(input: {
    tenantId: string;
    limit?: number;
    entityId?: string;
  }): Promise<AuditEvent[]> {
    const limit = Math.min(Math.max(input.limit ?? 40, 1), 100);
    const result = await this.pool.query(
      `
        SELECT
          id,
          tenant_id AS "tenantId",
          event_type AS "eventType",
          entity_type AS "entityType",
          entity_id AS "entityId",
          actor_type AS "actorType",
          actor_id AS "actorId",
          occurred_at AS "occurredAt",
          payload_json AS payload
        FROM audit_events
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR entity_id = $2)
        ORDER BY occurred_at DESC
        LIMIT $3
      `,
      [input.tenantId, input.entityId ?? null, limit],
    );

    return result.rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      eventType: row.eventType,
      entityType: row.entityType,
      entityId: row.entityId,
      actorType: row.actorType,
      actorId: row.actorId,
      occurredAt: new Date(row.occurredAt).toISOString(),
      payload: row.payload ?? {},
    }));
  }
}
