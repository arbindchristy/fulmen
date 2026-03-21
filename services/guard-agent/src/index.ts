import type {
  NormalizedChangeRequest,
  RiskPolicyAssessment,
  StructuredPlan,
} from '@fulmen/contracts';
import {
  normalizedChangeRequestSchema,
  riskPolicyAssessmentSchema,
  structuredPlanSchema,
} from '@fulmen/contracts';

import {
  changeControlPromptBoundaries,
  type AgentRole,
} from './prompts/change-control-prompt.js';

export interface GuardAgent {
  describePromptBoundary(role: AgentRole): string;
  validateNormalizedRequest(output: unknown): NormalizedChangeRequest;
  validateStructuredPlan(output: unknown): StructuredPlan;
  validateRiskAssessment(output: unknown): RiskPolicyAssessment;
}

export function createGuardAgent(): GuardAgent {
  return {
    describePromptBoundary(role: AgentRole): string {
      return changeControlPromptBoundaries[role];
    },
    validateNormalizedRequest(output: unknown): NormalizedChangeRequest {
      return normalizedChangeRequestSchema.parse(output);
    },
    validateStructuredPlan(output: unknown): StructuredPlan {
      return structuredPlanSchema.parse(output);
    },
    validateRiskAssessment(output: unknown): RiskPolicyAssessment {
      return riskPolicyAssessmentSchema.parse(output);
    },
  };
}
