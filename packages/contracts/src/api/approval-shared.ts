import { z } from 'zod';

export const approvalStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
]);

export const approvalRequestSummarySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  changeRequestId: z.string().uuid(),
  status: approvalStatusSchema,
  assignedRole: z.string(),
  assignedUserId: z.string().uuid().nullable(),
  actionId: z.string(),
  actionTitle: z.string(),
  actionSummary: z.string(),
  actionType: z.string(),
  resourceRef: z.string(),
  createdAt: z.string().datetime(),
});

export const approvalDecisionRecordSchema = z.object({
  decision: approvalStatusSchema.exclude(['pending']),
  decidedBy: z.string().uuid(),
  justification: z.string(),
  decidedAt: z.string().datetime(),
});

export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;
export type ApprovalRequestSummary = z.infer<
  typeof approvalRequestSummarySchema
>;
export type ApprovalDecisionRecord = z.infer<
  typeof approvalDecisionRecordSchema
>;
