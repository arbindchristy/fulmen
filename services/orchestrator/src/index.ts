import type {
  ChangeRequest,
  CreateChangeRequestInput,
  GovernedPreviewResponse,
  RiskPolicyAssessment,
} from '@fulmen/contracts';
import type { AuditService } from '@fulmen/audit';
import type { GuardAgent } from '@fulmen/guard-agent';
import type { PolicyDecisionService } from '@fulmen/policy-engine';

import {
  createDeterministicIntakeAgent,
  createDeterministicPlanningAgent,
  createDeterministicRiskPolicyAgent,
  type IntakeAgent,
  type PlanningAgent,
  type RiskPolicyAgent,
} from './agent-workflow/agents.js';

export interface OrchestratorDependencies {
  auditService: AuditService;
  intakeAgent: IntakeAgent;
  planningAgent: PlanningAgent;
  riskPolicyAgent: RiskPolicyAgent;
  policyDecisionService: PolicyDecisionService;
}

export interface Orchestrator {
  preview(input: {
    changeRequest: ChangeRequest;
    submission: CreateChangeRequestInput;
  }): Promise<GovernedPreviewResponse>;
}

export function createOrchestrator(
  dependencies: OrchestratorDependencies,
): Orchestrator {
  return {
    async preview({ changeRequest, submission }) {
      const normalizedRequest = dependencies.intakeAgent.normalize(submission);
      const actionPlan = dependencies.planningAgent.plan(normalizedRequest);

      const governedActions = actionPlan.actions.map((action) => {
        const riskAssessment = dependencies.riskPolicyAgent.assess({
          action,
          normalizedRequest,
          requestedRiskLevel: submission.riskLevel,
        });
        const policyDecision = dependencies.policyDecisionService.evaluate(
          action,
          submission.riskLevel,
        );

        return {
          action,
          riskAssessment,
          policyDecision,
          approvalRequired: policyDecision.decision === 'require_approval',
        };
      });

      await dependencies.auditService.record({
        tenantId: changeRequest.tenantId,
        eventType: 'run.started',
        entityType: 'change_request',
        entityId: changeRequest.id,
        actorType: 'system',
        actorId: 'orchestrator',
        payload: {
          preview: true,
          actionCount: actionPlan.actions.length,
          approvalRequiredActions: governedActions
            .filter((action) => action.approvalRequired)
            .map((action) => action.action.id),
        },
      });

      return {
        changeRequest,
        normalizedRequest,
        actionPlan,
        governedActions,
        previewSummary: buildPreviewSummary(governedActions.map((action) => ({
          approvalRequired: action.approvalRequired,
          riskAssessment: action.riskAssessment,
        }))),
      };
    },
  };
}

export function createDefaultOrchestrator(dependencies: {
  auditService: AuditService;
  guardAgent: GuardAgent;
  policyDecisionService: PolicyDecisionService;
}): Orchestrator {
  return createOrchestrator({
    auditService: dependencies.auditService,
    intakeAgent: createDeterministicIntakeAgent(dependencies.guardAgent),
    planningAgent: createDeterministicPlanningAgent(dependencies.guardAgent),
    riskPolicyAgent: createDeterministicRiskPolicyAgent(dependencies.guardAgent),
    policyDecisionService: dependencies.policyDecisionService,
  });
}

function buildPreviewSummary(
  actions: Array<{
    approvalRequired: boolean;
    riskAssessment: RiskPolicyAssessment;
  }>,
): string {
  const approvalCount = actions.filter((action) => action.approvalRequired).length;
  const highRiskCount = actions.filter(
    (action) => action.riskAssessment.riskLevel === 'high',
  ).length;

  if (approvalCount > 0) {
    return `Preview prepared with ${approvalCount} action${approvalCount === 1 ? '' : 's'} requiring approval before execution.`;
  }

  if (highRiskCount > 0) {
    return 'Preview prepared with high-risk context captured, but the current policy bundle did not require approval for every step.';
  }

  return 'Preview prepared with bounded actions and attached system policy decisions.';
}

export * from './agent-workflow/agents.js';
