import type { PlannedAction } from '@fulmen/contracts';

export interface StubExecutionResult {
  connector: 'stub-change-control';
  status: 'simulated';
  action: string;
  resourceRef: string;
  summary: string;
}

export class StubChangeControlConnector {
  execute(action: PlannedAction): StubExecutionResult {
    return {
      connector: 'stub-change-control',
      status: 'simulated',
      action: action.actionType,
      resourceRef: action.resourceRef,
      summary: `Simulated execution for ${action.actionType} on ${action.resourceRef}.`,
    };
  }
}
