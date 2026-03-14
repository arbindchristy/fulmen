import {
  structuredPlanSchema,
  type StructuredPlan,
} from '@fulmen/contracts';

export function validateStructuredPlan(plan: unknown): StructuredPlan {
  return structuredPlanSchema.parse(plan);
}
