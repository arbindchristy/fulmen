import type { PlannedAction } from '@fulmen/contracts';

import { StubChangeControlConnector } from '../connectors/stub-change-control-connector.js';

export interface ToolGateway {
  execute(action: PlannedAction): ReturnType<StubChangeControlConnector['execute']>;
}

export function createToolGateway(): ToolGateway {
  const connector = new StubChangeControlConnector();

  return {
    execute(action) {
      return connector.execute(action);
    },
  };
}
