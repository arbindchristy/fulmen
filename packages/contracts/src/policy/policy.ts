import { z } from 'zod';

export const policyDecisionValueSchema = z.enum([
  'allow',
  'deny',
  'require_approval',
]);

export const policyDecisionSchema = z.object({
  actionType: z.string(),
  resourceRef: z.string(),
  decision: policyDecisionValueSchema,
  reasonCode: z.string(),
  explanation: z.string(),
});

export const policyRuleSchema = z.object({
  id: z.string(),
  description: z.string(),
  actionType: z.string(),
  minRiskLevel: z.enum(['low', 'medium', 'high']).optional(),
  decision: policyDecisionValueSchema,
});

export const policyBundleSchema = z.object({
  name: z.string(),
  version: z.string(),
  workflow: z.literal('change-control'),
  rules: z.array(policyRuleSchema).min(1),
});

export type PolicyDecision = z.infer<typeof policyDecisionSchema>;
export type PolicyBundle = z.infer<typeof policyBundleSchema>;
