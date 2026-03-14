import { z } from 'zod';

export const runStatusSchema = z.enum([
  'pending',
  'planning',
  'awaiting_approval',
  'executing',
  'completed',
  'failed',
]);

export const plannedActionSchema = z.object({
  id: z.string(),
  actionType: z.string(),
  resourceRef: z.string(),
  summary: z.string(),
  requiresApproval: z.boolean(),
});

export const structuredPlanSchema = z.object({
  planId: z.string(),
  summary: z.string(),
  actions: z.array(plannedActionSchema).min(1),
});

export const runRecordSchema = z.object({
  id: z.string().uuid(),
  changeRequestId: z.string().uuid(),
  status: runStatusSchema,
  createdAt: z.string().datetime(),
});

export type PlannedAction = z.infer<typeof plannedActionSchema>;
export type StructuredPlan = z.infer<typeof structuredPlanSchema>;
export type RunRecord = z.infer<typeof runRecordSchema>;
