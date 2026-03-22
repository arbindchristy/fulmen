import { z } from 'zod';

import { approvalRequestSummarySchema } from './approvals.js';
import { policyDecisionSchema } from '../policy/policy.js';
import { structuredPlanSchema } from './workflows.js';

export const riskLevelSchema = z.enum(['low', 'medium', 'high']);

export const changeRequestStatusSchema = z.enum([
  'draft',
  'submitted',
  'preview_ready',
  'in_review',
  'approved',
  'rejected',
  'running',
  'completed',
  'failed',
]);

export const requestedWindowSchema = z
  .object({
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
  })
  .refine(
    (window) =>
      !window.startAt ||
      !window.endAt ||
      new Date(window.endAt).getTime() >= new Date(window.startAt).getTime(),
    {
      message: 'Requested window end must be after the start time.',
      path: ['endAt'],
    },
  );

export const createChangeRequestInputSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(1).max(5000),
  rationale: z.string().min(1).max(2000),
  riskLevel: riskLevelSchema,
  targetRef: z.string().min(1).max(255),
  environment: z.string().min(1).max(64),
  requestedWindow: requestedWindowSchema.optional(),
});

export const changeRequestSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  requestKey: z.string(),
  title: z.string(),
  description: z.string(),
  rationale: z.string(),
  riskLevel: riskLevelSchema,
  status: changeRequestStatusSchema,
  targetRef: z.string(),
  environment: z.string(),
  requestedBy: z.string().uuid(),
  requestedWindow: requestedWindowSchema.optional(),
  createdAt: z.string().datetime(),
});

export const normalizedChangeRequestSchema = z.object({
  title: z.string(),
  changeCategory: z.enum([
    'configuration',
    'infrastructure',
    'maintenance',
    'network',
    'rollback',
    'security',
    'other',
  ]),
  targetRef: z.string(),
  environment: z.string(),
  requestedOutcome: z.string(),
  rationale: z.string(),
  operatorIntentSummary: z.string(),
  assumptions: z.array(z.string()),
  missingInformation: z.array(z.string()),
  requestedWindow: requestedWindowSchema.optional(),
});

export const riskPolicyAssessmentSchema = z.object({
  actionId: z.string(),
  riskLevel: riskLevelSchema,
  posture: z.enum(['inform', 'review', 'block']),
  summary: z.string(),
  factors: z.array(z.string()).min(1),
});

export const governedActionPreviewSchema = z.object({
  action: structuredPlanSchema.shape.actions.element,
  riskAssessment: riskPolicyAssessmentSchema,
  policyDecision: policyDecisionSchema,
  approvalRequired: z.boolean(),
  approvalRequest: approvalRequestSummarySchema.nullable().optional(),
});

export const governedPreviewResponseSchema = z.object({
  changeRequest: changeRequestSchema,
  normalizedRequest: normalizedChangeRequestSchema,
  actionPlan: structuredPlanSchema,
  governedActions: z.array(governedActionPreviewSchema).min(1),
  previewSummary: z.string(),
});

export type CreateChangeRequestInput = z.infer<
  typeof createChangeRequestInputSchema
>;
export type ChangeRequest = z.infer<typeof changeRequestSchema>;
export type ChangeRequestStatus = z.infer<typeof changeRequestStatusSchema>;
export type NormalizedChangeRequest = z.infer<
  typeof normalizedChangeRequestSchema
>;
export type RiskPolicyAssessment = z.infer<typeof riskPolicyAssessmentSchema>;
export type GovernedActionPreview = z.infer<
  typeof governedActionPreviewSchema
>;
export type GovernedPreviewResponse = z.infer<
  typeof governedPreviewResponseSchema
>;
