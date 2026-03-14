import type { CreateChangeRequestInput, PlannedAction, PolicyDecision } from '@fulmen/contracts';
import type { AuditService } from '@fulmen/audit';
import type { GuardAgent } from '@fulmen/guard-agent';
import type { PolicyDecisionService } from '@fulmen/policy-engine';
import type { ToolGateway } from '@fulmen/tool-gateway';

import { buildPlanWithGuardAgent } from './planners/stub-planner.js';
import { createPendingRun } from './state-machine/run-state-machine.js';

export interface OrchestratorDependencies {
  auditService: AuditService;
  guardAgent: GuardAgent;
  policyDecisionService: PolicyDecisionService;
  toolGateway: ToolGateway;
}

export interface OrchestrationPreview {
  run: ReturnType<typeof createPendingRun>;
  planSummary: string;
  decisions: PolicyDecision[];
}

export interface Orchestrator {
  preview(input: CreateChangeRequestInput): OrchestrationPreview;
  executeStubAction(action: PlannedAction): ReturnType<ToolGateway['execute']>;
}

export function createOrchestrator(
  dependencies: OrchestratorDependencies,
): Orchestrator {
  return {
    preview(input: CreateChangeRequestInput): OrchestrationPreview {
      const run = createPendingRun(`Run prepared for ${input.title}`);
      const plan = buildPlanWithGuardAgent(dependencies.guardAgent, input);
      const decisions = plan.actions.map((action: PlannedAction) =>
        dependencies.policyDecisionService.evaluate(action, input.riskLevel),
      );

      dependencies.auditService.record({
        tenantId: '00000000-0000-0000-0000-000000000001',
        eventType: 'run.started',
        entityType: 'run',
        entityId: 'preview',
        actorType: 'system',
        actorId: 'orchestrator',
        payload: {
          planId: plan.planId,
          actionCount: plan.actions.length,
        },
      });

      return {
        run,
        planSummary: plan.summary,
        decisions,
      };
    },
    executeStubAction(action: PlannedAction) {
      return dependencies.toolGateway.execute(action);
    },
  };
}
