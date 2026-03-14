import type {
  CreateChangeRequestInput,
  StructuredPlan,
} from '@fulmen/contracts';

import { changeControlPromptTemplate } from './prompts/change-control-prompt.js';
import { validateStructuredPlan } from './validators/plan-validator.js';

export interface GuardAgent {
  describePromptBoundary(): string;
  buildStubPlan(input: CreateChangeRequestInput): StructuredPlan;
}

export function createGuardAgent(): GuardAgent {
  return {
    describePromptBoundary(): string {
      return changeControlPromptTemplate;
    },
    buildStubPlan(input: CreateChangeRequestInput): StructuredPlan {
      return validateStructuredPlan({
        planId: `stub-plan-${input.targetRef}`,
        summary: `Governed plan for ${input.title}`,
        actions: [
          {
            id: 'validate-target',
            actionType: 'change.validate',
            resourceRef: input.targetRef,
            summary: `Validate ${input.targetRef} in ${input.environment}`,
            requiresApproval: false,
          },
          {
            id: 'execute-change',
            actionType: 'change.execute',
            resourceRef: input.targetRef,
            summary: `Execute approved change on ${input.targetRef}`,
            requiresApproval: input.riskLevel === 'high',
          },
        ],
      });
    },
  };
}
