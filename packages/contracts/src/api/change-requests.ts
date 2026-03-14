import { z } from 'zod';

export const riskLevelSchema = z.enum(['low', 'medium', 'high']);

export const changeRequestStatusSchema = z.enum([
  'draft',
  'submitted',
  'in_review',
  'approved',
  'rejected',
  'running',
  'completed',
  'failed',
]);

export const createChangeRequestInputSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(1).max(5000),
  riskLevel: riskLevelSchema,
  targetRef: z.string().min(1).max(255),
  environment: z.string().min(1).max(64),
});

export const changeRequestSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  riskLevel: riskLevelSchema,
  status: changeRequestStatusSchema,
  targetRef: z.string(),
  environment: z.string(),
  createdAt: z.string().datetime(),
});

export type CreateChangeRequestInput = z.infer<
  typeof createChangeRequestInputSchema
>;
export type ChangeRequest = z.infer<typeof changeRequestSchema>;
