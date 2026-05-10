import { randomUUID } from 'node:crypto';

import { auditEventSchema, type AuditEvent, type AuditEventType } from '@fulmen/contracts';

export interface RecordAuditEventInput {
  tenantId: string;
  eventType: AuditEventType;
  entityType: string;
  entityId: string;
  actorType: 'system' | 'user';
  actorId: string;
  payload?: Record<string, unknown>;
}

export interface AuditEventStore {
  append(event: AuditEvent): Promise<void>;
  listRecent(input: {
    tenantId: string;
    limit?: number;
    entityId?: string;
  }): Promise<AuditEvent[]>;
}

export class AuditService {
  constructor(private readonly store?: AuditEventStore) {}

  async record(input: RecordAuditEventInput): Promise<AuditEvent> {
    const event = auditEventSchema.parse({
      id: randomUUID(),
      tenantId: input.tenantId,
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      actorType: input.actorType,
      actorId: input.actorId,
      occurredAt: new Date().toISOString(),
      payload: input.payload ?? {},
    });

    await this.store?.append(event);

    return event;
  }

  async listRecent(input: {
    tenantId: string;
    limit?: number;
    entityId?: string;
  }): Promise<AuditEvent[]> {
    return this.store?.listRecent(input) ?? [];
  }
}
