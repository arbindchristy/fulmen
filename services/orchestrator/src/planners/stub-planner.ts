import type { CreateChangeRequestInput, StructuredPlan } from '@fulmen/contracts';
import type { GuardAgent } from '@fulmen/guard-agent';

export function buildPlanWithGuardAgent(
  guardAgent: GuardAgent,
  input: CreateChangeRequestInput,
): StructuredPlan {
  return guardAgent.buildStubPlan(input);
}
