import type {
  CreateChangeRequestInput,
  NormalizedChangeRequest,
  PlannedAction,
  RiskPolicyAssessment,
  StructuredPlan,
} from '@fulmen/contracts';
import type { GuardAgent } from '@fulmen/guard-agent';

export interface IntakeAgent {
  normalize(input: CreateChangeRequestInput): NormalizedChangeRequest;
}

export interface PlanningAgent {
  plan(normalizedRequest: NormalizedChangeRequest): StructuredPlan;
}

export interface RiskPolicyAgent {
  assess(input: {
    action: PlannedAction;
    normalizedRequest: NormalizedChangeRequest;
    requestedRiskLevel: CreateChangeRequestInput['riskLevel'];
  }): RiskPolicyAssessment;
}

export function createDeterministicIntakeAgent(
  guardAgent: GuardAgent,
): IntakeAgent {
  return {
    normalize(input) {
      return guardAgent.validateNormalizedRequest({
        title: input.title.trim(),
        changeCategory: inferChangeCategory(input),
        targetRef: input.targetRef.trim(),
        environment: input.environment.trim().toLowerCase(),
        requestedOutcome: summarizeOutcome(input.description),
        rationale: input.rationale.trim(),
        operatorIntentSummary: summarizeIntent(input),
        assumptions: buildAssumptions(input),
        missingInformation: buildMissingInformation(input),
        requestedWindow: input.requestedWindow,
      });
    },
  };
}

export function createDeterministicPlanningAgent(
  guardAgent: GuardAgent,
): PlanningAgent {
  return {
    plan(normalizedRequest) {
      const actions: PlannedAction[] = [
        {
          id: 'validate-target',
          kind: 'validation',
          title: 'Validate target and maintenance window',
          actionType: 'change.validate',
          resourceRef: normalizedRequest.targetRef,
          summary: `Confirm ${normalizedRequest.targetRef} is reachable and the requested window is safe for ${normalizedRequest.environment}.`,
          rationale:
            'Validation stays inside the governed preview path and checks preconditions before any execution would be considered.',
        },
        {
          id: 'execute-change',
          kind: 'execution',
          title: 'Apply the requested change',
          actionType: 'change.execute',
          resourceRef: normalizedRequest.targetRef,
          summary: `Apply the requested ${normalizedRequest.changeCategory} change to ${normalizedRequest.targetRef}.`,
          rationale: normalizedRequest.operatorIntentSummary,
        },
        {
          id: 'verify-outcome',
          kind: 'verification',
          title: 'Verify service health after change',
          actionType: 'change.validate',
          resourceRef: normalizedRequest.targetRef,
          summary: `Verify the target remains healthy after the requested change on ${normalizedRequest.targetRef}.`,
          rationale:
            'A post-change verification step is required so the governed preview remains explicit about rollback and validation expectations.',
        },
      ];

      return guardAgent.validateStructuredPlan({
        planId: `plan-${normalizedRequest.targetRef.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        summary: `Validate the target, apply the requested change, and verify the outcome for ${normalizedRequest.targetRef}.`,
        actions,
      });
    },
  };
}

export function createDeterministicRiskPolicyAgent(
  guardAgent: GuardAgent,
): RiskPolicyAgent {
  return {
    assess({ action, normalizedRequest, requestedRiskLevel }) {
      const productionLike = normalizedRequest.environment === 'production';
      const executionStep = action.kind === 'execution';
      const posture =
        requestedRiskLevel === 'high' || (productionLike && executionStep)
          ? 'review'
          : requestedRiskLevel === 'medium'
            ? 'inform'
            : 'inform';

      const factors = [
        `Declared operator risk: ${requestedRiskLevel}.`,
        `Environment: ${normalizedRequest.environment}.`,
      ];

      if (executionStep) {
        factors.push('This step changes the target state.');
      } else {
        factors.push('This step is scoped to validation or verification.');
      }

      if (normalizedRequest.missingInformation.length > 0) {
        factors.push(
          `Missing information noted by Intake Agent: ${normalizedRequest.missingInformation.join(', ')}.`,
        );
      }

      return guardAgent.validateRiskAssessment({
        actionId: action.id,
        riskLevel: requestedRiskLevel,
        posture,
        summary: buildAssessmentSummary({
          action,
          normalizedRequest,
          requestedRiskLevel,
          posture,
        }),
        factors,
      });
    },
  };
}

function inferChangeCategory(
  input: CreateChangeRequestInput,
): NormalizedChangeRequest['changeCategory'] {
  const haystack = `${input.title} ${input.description} ${input.targetRef}`.toLowerCase();

  if (haystack.includes('firewall') || haystack.includes('router') || haystack.includes('switch')) {
    return 'network';
  }

  if (haystack.includes('patch') || haystack.includes('restart') || haystack.includes('maintenance')) {
    return 'maintenance';
  }

  if (haystack.includes('rollback')) {
    return 'rollback';
  }

  if (haystack.includes('secret') || haystack.includes('certificate') || haystack.includes('credential')) {
    return 'security';
  }

  if (haystack.includes('server') || haystack.includes('cluster') || haystack.includes('node')) {
    return 'infrastructure';
  }

  if (haystack.includes('config') || haystack.includes('setting')) {
    return 'configuration';
  }

  return 'other';
}

function summarizeOutcome(description: string): string {
  const trimmed = description.trim();
  const firstSentence = trimmed.split(/[.!?]/, 1)[0] ?? '';

  return firstSentence.length > 0 ? firstSentence : trimmed;
}

function summarizeIntent(input: CreateChangeRequestInput): string {
  const windowSummary = input.requestedWindow?.startAt
    ? ` during the requested window starting ${input.requestedWindow.startAt}`
    : '';

  return `Apply the requested change to ${input.targetRef} in ${input.environment}${windowSummary}.`;
}

function buildAssumptions(input: CreateChangeRequestInput): string[] {
  const assumptions = [
    `The request applies to ${input.targetRef} in ${input.environment}.`,
  ];

  if (input.requestedWindow?.startAt && input.requestedWindow?.endAt) {
    assumptions.push('A bounded maintenance window has been proposed by the operator.');
  }

  return assumptions;
}

function buildMissingInformation(input: CreateChangeRequestInput): string[] {
  const missing: string[] = [];

  if (!input.description.toLowerCase().includes('rollback')) {
    missing.push('Explicit rollback details were not supplied in the request description.');
  }

  if (!input.requestedWindow?.startAt || !input.requestedWindow?.endAt) {
    missing.push('Requested maintenance window is incomplete.');
  }

  return missing;
}

function buildAssessmentSummary(input: {
  action: PlannedAction;
  normalizedRequest: NormalizedChangeRequest;
  requestedRiskLevel: CreateChangeRequestInput['riskLevel'];
  posture: RiskPolicyAssessment['posture'];
}): string {
  const base = `${input.action.title} targets ${input.normalizedRequest.targetRef} in ${input.normalizedRequest.environment}.`;

  if (input.posture === 'review') {
    return `${base} Review is recommended because the request is ${input.requestedRiskLevel} risk or changes a live environment.`;
  }

  if (input.requestedRiskLevel === 'medium') {
    return `${base} Medium-risk work can proceed only after the system policy posture is attached.`;
  }

  return `${base} This step remains low-complexity, but the system policy engine still decides whether execution would be allowed later.`;
}
