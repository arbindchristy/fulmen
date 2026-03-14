import { z } from 'zod';

export const auditEventTypeSchema = z.enum([
  'change_request.created',
  'change_request.submitted',
  'run.started',
  'run.step_started',
  'run.step_completed',
  'policy.decision_recorded',
  'approval.requested',
  'approval.decided',
  'tool.requested',
  'tool.executed',
  'tool.blocked',
  'run.completed',
]);

export const auditEventSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  eventType: auditEventTypeSchema,
  entityType: z.string(),
  entityId: z.string(),
  actorType: z.enum(['system', 'user']),
  actorId: z.string(),
  occurredAt: z.string().datetime(),
  payload: z.record(z.string(), z.unknown()),
});

export type AuditEvent = z.infer<typeof auditEventSchema>;
export type AuditEventType = z.infer<typeof auditEventTypeSchema>;
