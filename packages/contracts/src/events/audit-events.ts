import { z } from 'zod';

export const auditEventTypeSchema = z.enum([
  'change_request.created',
  'change_request.submitted',
  'change_request.preview_generated',
  'approval_request.created',
  'approval_request.approved',
  'approval_request.rejected',
  'run.started',
  'run.step_started',
  'run.step_completed',
  'policy.decision_recorded',
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
