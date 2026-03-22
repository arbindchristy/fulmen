import { z } from 'zod';

import { plannedActionSchema } from './workflows.js';
import { policyDecisionSchema } from '../policy/policy.js';

const approvalRiskLevelSchema = z.enum(['low', 'medium', 'high']);
const approvalRiskPolicyAssessmentSchema = z.object({
  actionId: z.string(),
  riskLevel: approvalRiskLevelSchema,
  posture: z.enum(['inform', 'review', 'block']),
  summary: z.string(),
  factors: z.array(z.string()).min(1),
});

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

export const approvalRequestListItemSchema = approvalRequestSummarySchema.extend({
  changeRequestTitle: z.string(),
  requestKey: z.string(),
  requestedBy: z.string().uuid(),
});

export const approvalDecisionRecordSchema = z.object({
  decision: approvalStatusSchema.exclude(['pending']),
  decidedBy: z.string().uuid(),
  justification: z.string(),
  decidedAt: z.string().datetime(),
});

export const approvalRequestDetailSchema = approvalRequestSummarySchema.extend({
  changeRequest: z.object({
    id: z.string().uuid(),
    requestKey: z.string(),
    title: z.string(),
    description: z.string(),
    rationale: z.string(),
    riskLevel: approvalRiskLevelSchema,
    targetRef: z.string(),
    environment: z.string(),
    requestedBy: z.string().uuid(),
    createdAt: z.string().datetime(),
  }),
  action: plannedActionSchema,
  policyDecision: policyDecisionSchema,
  riskAssessment: approvalRiskPolicyAssessmentSchema,
  decision: approvalDecisionRecordSchema.nullable(),
});

export const approvalDecisionInputSchema = z.object({
  justification: z.string().min(3).max(2000),
});

export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;
export type ApprovalRequestSummary = z.infer<
  typeof approvalRequestSummarySchema
>;
export type ApprovalRequestListItem = z.infer<
  typeof approvalRequestListItemSchema
>;
export type ApprovalDecisionRecord = z.infer<
  typeof approvalDecisionRecordSchema
>;
export type ApprovalRequestDetail = z.infer<
  typeof approvalRequestDetailSchema
>;
export type ApprovalDecisionInput = z.infer<
  typeof approvalDecisionInputSchema
>;
