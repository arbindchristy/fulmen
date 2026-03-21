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
}
