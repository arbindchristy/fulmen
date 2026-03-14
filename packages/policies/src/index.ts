import type { PolicyBundle } from '@fulmen/contracts';

export const changeControlDefaultPolicy: PolicyBundle = {
  name: 'change-control-default',
  version: '0.1.0',
  workflow: 'change-control',
  rules: [
    {
      id: 'allow-low-risk-validation',
      description: 'Validation actions on low-risk changes are allowed.',
      actionType: 'change.validate',
      minRiskLevel: 'low',
      decision: 'allow',
    },
    {
      id: 'require-approval-high-risk-execution',
      description: 'Execution actions on high-risk changes require approval.',
      actionType: 'change.execute',
      minRiskLevel: 'high',
      decision: 'require_approval',
    },
    {
      id: 'allow-medium-risk-execution',
      description:
        'Medium-risk execution remains governed but is allowed by default for the stub flow.',
      actionType: 'change.execute',
      minRiskLevel: 'medium',
      decision: 'allow',
    },
  ],
};
