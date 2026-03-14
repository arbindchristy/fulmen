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

export class AuditService {
  record(input: RecordAuditEventInput): AuditEvent {
    return auditEventSchema.parse({
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
  }
}
