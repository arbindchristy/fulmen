import type { PlannedAction, PolicyDecision } from '@fulmen/contracts';

import { evaluateChangeControlAction } from '../evaluators/change-control-evaluator.js';

export interface PolicyDecisionService {
  evaluate(action: PlannedAction, riskLevel: 'low' | 'medium' | 'high'): PolicyDecision;
}

export function createPolicyDecisionService(): PolicyDecisionService {
  return {
    evaluate(action, riskLevel) {
      return evaluateChangeControlAction(action, riskLevel);
    },
  };
}
