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
  buildEvidenceArtifacts,
  buildEvidenceGaps,
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
      const artifacts = buildEvidenceArtifacts(normalizedRequest);
      const gaps = buildEvidenceGaps({
        artifacts,
        normalizedRequest,
        requestedRiskLevel: submission.riskLevel,
      });

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

      const evidencePack = {
        coverageSummary: buildCoverageSummary({
          normalizedRequest,
          artifacts,
          gaps,
        }),
        narrativeDraft: buildNarrativeDraft({
          normalizedRequest,
          artifacts,
          gaps,
        }),
        artifacts,
        gaps,
        followUps: gaps.map((gap) => gap.remediation),
      };

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
        evidencePack,
        previewSummary: buildPreviewSummary({
          actions: governedActions.map((action) => ({
            approvalRequired: action.approvalRequired,
            riskAssessment: action.riskAssessment,
          })),
          gaps,
        }),
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

function buildPreviewSummary(input: {
  actions: Array<{
    approvalRequired: boolean;
    riskAssessment: RiskPolicyAssessment;
  }>;
  gaps: Array<{ severity: 'low' | 'medium' | 'high' }>;
}): string {
  const approvalCount = input.actions.filter((action) => action.approvalRequired).length;
  const highRiskCount = input.actions.filter(
    (action) => action.riskAssessment.riskLevel === 'high',
  ).length;
  const criticalGapCount = input.gaps.filter((gap) => gap.severity === 'high').length;

  if (approvalCount > 0) {
    return `Evidence pack prepared with ${criticalGapCount} high-severity gap${criticalGapCount === 1 ? '' : 's'} and ${approvalCount} governed review action${approvalCount === 1 ? '' : 's'} requiring approval.`;
  }

  if (highRiskCount > 0) {
    return 'Evidence pack prepared with high-sensitivity context captured, but the current policy bundle did not require approval for every review step.';
  }

  return 'Evidence pack prepared with bounded collection, reconciliation, and narrative actions plus attached system policy decisions.';
}

function buildCoverageSummary(input: {
  normalizedRequest: GovernedPreviewResponse['normalizedRequest'];
  artifacts: GovernedPreviewResponse['evidencePack']['artifacts'];
  gaps: GovernedPreviewResponse['evidencePack']['gaps'];
}): string {
  const readyArtifacts = input.artifacts.filter((artifact) => artifact.status === 'ready').length;

  return `${readyArtifacts} of ${input.artifacts.length} artifacts are audit-ready for ${input.normalizedRequest.framework} control ${input.normalizedRequest.targetRef}. ${input.gaps.length} gap${input.gaps.length === 1 ? '' : 's'} remain open for reviewer adjudication.`;
}

function buildNarrativeDraft(input: {
  normalizedRequest: GovernedPreviewResponse['normalizedRequest'];
  artifacts: GovernedPreviewResponse['evidencePack']['artifacts'];
  gaps: GovernedPreviewResponse['evidencePack']['gaps'];
}): string {
  const currentArtifacts = input.artifacts
    .filter((artifact) => artifact.status === 'ready')
    .map((artifact) => artifact.system)
    .join(', ');

  const openGapLine =
    input.gaps.length > 0
      ? ` Open items remain around ${input.gaps.map((gap) => gap.title.toLowerCase()).join('; ')}.`
      : ' No material gaps remain in the current pack.';

  return `${input.normalizedRequest.framework} control ${input.normalizedRequest.targetRef} for ${input.normalizedRequest.controlFamily} is supported by evidence from ${currentArtifacts || 'declared systems still pending confirmation'}. The current draft links each assertion to system provenance and flags unresolved exceptions for human review.${openGapLine}`;
}

export * from './agent-workflow/agents.js';
