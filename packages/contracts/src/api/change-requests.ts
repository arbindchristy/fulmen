import { z } from 'zod';

import {
  approvalDecisionRecordSchema,
  approvalRequestSummarySchema,
} from './approval-shared.js';
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

export const evidenceSystemSchema = z.string().min(2).max(64);

export const createChangeRequestInputSchema = z.object({
  title: z.string().min(3).max(200),
  controlFamily: z.string().min(2).max(120),
  framework: z.string().min(2).max(120),
  description: z.string().min(1).max(5000),
  rationale: z.string().min(1).max(2000),
  businessOwner: z.string().min(2).max(120),
  sourceSystems: z.array(evidenceSystemSchema).min(1).max(8),
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
  controlFamily: z.string(),
  framework: z.string(),
  description: z.string(),
  rationale: z.string(),
  businessOwner: z.string(),
  sourceSystems: z.array(evidenceSystemSchema),
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
  controlFamily: z.string(),
  framework: z.string(),
  targetRef: z.string(),
  environment: z.string(),
  businessOwner: z.string(),
  sourceSystems: z.array(evidenceSystemSchema),
  requestedOutcome: z.string(),
  rationale: z.string(),
  operatorIntentSummary: z.string(),
  expectedArtifacts: z.array(z.string()).min(1),
  assumptions: z.array(z.string()),
  missingInformation: z.array(z.string()),
  requestedWindow: requestedWindowSchema.optional(),
});

export const evidenceArtifactStatusSchema = z.enum([
  'ready',
  'partial',
  'missing',
]);

export const evidenceArtifactSchema = z.object({
  id: z.string(),
  system: z.string(),
  artifactType: z.string(),
  title: z.string(),
  description: z.string(),
  status: evidenceArtifactStatusSchema,
  freshness: z.enum(['current', 'aging', 'stale']),
  provenance: z.string(),
});

export const evidenceGapSchema = z.object({
  id: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  title: z.string(),
  summary: z.string(),
  remediation: z.string(),
  approvalRequired: z.boolean(),
});

export const evidencePackSchema = z.object({
  coverageSummary: z.string(),
  narrativeDraft: z.string(),
  artifacts: z.array(evidenceArtifactSchema).min(1),
  gaps: z.array(evidenceGapSchema),
  followUps: z.array(z.string()),
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
  approvalDecision: approvalDecisionRecordSchema.nullable().optional(),
});

export const governedPreviewResponseSchema = z.object({
  changeRequest: changeRequestSchema,
  normalizedRequest: normalizedChangeRequestSchema,
  actionPlan: structuredPlanSchema,
  governedActions: z.array(governedActionPreviewSchema).min(1),
  evidencePack: evidencePackSchema,
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
export type EvidenceArtifact = z.infer<typeof evidenceArtifactSchema>;
export type EvidenceGap = z.infer<typeof evidenceGapSchema>;
export type EvidencePack = z.infer<typeof evidencePackSchema>;
