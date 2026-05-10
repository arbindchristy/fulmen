import { z } from 'zod';

import { changeRequestStatusSchema } from './change-requests.js';
import {
  approvalDecisionRecordSchema,
  approvalRequestSummarySchema,
} from './approval-shared.js';
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

export const approvalRequestListItemSchema = approvalRequestSummarySchema.extend({
  changeRequestTitle: z.string(),
  requestKey: z.string(),
  requestedBy: z.string().uuid(),
});

export const approvalRequestDetailSchema = approvalRequestSummarySchema.extend({
  changeRequest: z.object({
    id: z.string().uuid(),
    requestKey: z.string(),
    title: z.string(),
    controlFamily: z.string(),
    framework: z.string(),
    description: z.string(),
    rationale: z.string(),
    businessOwner: z.string(),
    sourceSystems: z.array(z.string()),
    riskLevel: approvalRiskLevelSchema,
    status: changeRequestStatusSchema,
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

export type ApprovalRequestListItem = z.infer<
  typeof approvalRequestListItemSchema
>;
export type ApprovalRequestDetail = z.infer<
  typeof approvalRequestDetailSchema
>;
export type ApprovalDecisionInput = z.infer<
  typeof approvalDecisionInputSchema
>;

export type {
  ApprovalStatus,
  ApprovalDecisionRecord,
  ApprovalRequestSummary,
} from './approval-shared.js';
