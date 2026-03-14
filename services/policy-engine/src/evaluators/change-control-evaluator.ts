import type { PolicyDecision, PlannedAction } from '@fulmen/contracts';

import { changeControlRuleSet } from '../rules/change-control-rule-set.js';

const riskWeights = {
  low: 1,
  medium: 2,
  high: 3,
} as const;

export function evaluateChangeControlAction(
  action: PlannedAction,
  riskLevel: keyof typeof riskWeights,
): PolicyDecision {
  const matchedRule = changeControlRuleSet.rules.find((rule) => {
    if (rule.actionType !== action.actionType) {
      return false;
    }

    if (!rule.minRiskLevel) {
      return true;
    }

    return riskWeights[riskLevel] >= riskWeights[rule.minRiskLevel];
  });

  if (!matchedRule) {
    return {
      actionType: action.actionType,
      resourceRef: action.resourceRef,
      decision: 'deny',
      reasonCode: 'policy.no_match',
      explanation: 'No matching policy rule exists for the requested action.',
    };
  }

  return {
    actionType: action.actionType,
    resourceRef: action.resourceRef,
    decision: matchedRule.decision,
    reasonCode: `policy.${matchedRule.id}`,
    explanation: matchedRule.description,
  };
}
