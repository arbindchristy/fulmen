import type {
  CreateChangeRequestInput,
  EvidenceArtifact,
  EvidenceGap,
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
        controlFamily: input.controlFamily.trim(),
        framework: input.framework.trim(),
        targetRef: input.targetRef.trim(),
        environment: input.environment.trim(),
        businessOwner: input.businessOwner.trim(),
        sourceSystems: input.sourceSystems.map((system) => system.trim()),
        requestedOutcome: summarizeOutcome(input),
        rationale: input.rationale.trim(),
        operatorIntentSummary: summarizeIntent(input),
        expectedArtifacts: buildExpectedArtifacts(input),
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
          id: 'collect-evidence',
          kind: 'collection',
          title: 'Collect governed evidence from declared systems',
          actionType: 'evidence.collect',
          resourceRef: normalizedRequest.targetRef,
          summary: `Collect time-bounded evidence for ${normalizedRequest.targetRef} from ${normalizedRequest.sourceSystems.join(', ')}.`,
          rationale:
            'Collection stays inside the system-controlled path and preserves provenance for each artifact.',
        },
        {
          id: 'reconcile-coverage',
          kind: 'reconciliation',
          title: 'Reconcile evidence against the control objective',
          actionType: 'evidence.reconcile',
          resourceRef: normalizedRequest.targetRef,
          summary: `Compare submitted artifacts to the ${normalizedRequest.framework} control objective and flag unsupported assertions.`,
          rationale:
            'Reconciliation is where the product determines whether the evidence chain is coherent enough for review.',
        },
        {
          id: 'draft-narrative',
          kind: 'narrative',
          title: 'Draft the control narrative and exception summary',
          actionType: 'evidence.compose',
          resourceRef: normalizedRequest.targetRef,
          summary: `Prepare the audit narrative for ${normalizedRequest.targetRef} with linked rationale for each artifact and gap.`,
          rationale:
            'Narrative drafting turns fragmented evidence into a reviewable pack without granting final acceptance authority to the model.',
        },
        {
          id: 'adjudicate-gaps',
          kind: 'adjudication',
          title: 'Adjudicate evidence gaps and compensating explanations',
          actionType: 'evidence.exception_review',
          resourceRef: normalizedRequest.targetRef,
          summary: `Route unresolved gaps and compensating explanations for ${normalizedRequest.targetRef} through governed review.`,
          rationale:
            'Gap acceptance is the trust boundary where human review and policy controls must remain authoritative.',
        },
      ];

      return guardAgent.validateStructuredPlan({
        planId: `plan-${normalizedRequest.targetRef.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        summary: `Collect, reconcile, narrate, and adjudicate evidence for ${normalizedRequest.targetRef}.`,
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
      const highTrustCycle = requestedRiskLevel === 'high';
      const adjudicationStep = action.kind === 'adjudication';
      const posture =
        adjudicationStep && highTrustCycle
          ? 'review'
          : action.kind === 'reconciliation' && normalizedRequest.missingInformation.length > 0
            ? 'review'
            : requestedRiskLevel === 'medium'
            ? 'inform'
            : 'inform';

      const factors = [
        `Evidence sensitivity: ${requestedRiskLevel}.`,
        `Operating area: ${normalizedRequest.environment}.`,
        `Declared systems: ${normalizedRequest.sourceSystems.join(', ')}.`,
      ];

      if (adjudicationStep) {
        factors.push('This step can accept evidence gaps or compensating explanations.');
      } else if (action.kind === 'reconciliation') {
        factors.push('This step decides whether the current artifacts support the control objective.');
      } else if (action.kind === 'narrative') {
        factors.push('This step drafts reviewer-facing evidence explanations.');
      } else {
        factors.push('This step collects or normalizes evidence without final acceptance.');
      }

      if (normalizedRequest.missingInformation.length > 0) {
        factors.push(
          `Open intake gaps: ${normalizedRequest.missingInformation.join(', ')}.`,
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

function summarizeOutcome(input: CreateChangeRequestInput): string {
  const trimmed = input.description.trim();
  const firstSentence = trimmed.split(/[.!?]/, 1)[0] ?? '';
  const base = firstSentence.length > 0 ? firstSentence : trimmed;

  return `${base} for ${input.framework} control ${input.targetRef}.`;
}

function summarizeIntent(input: CreateChangeRequestInput): string {
  const windowSummary = input.requestedWindow?.startAt
    ? ` for the evidence window starting ${input.requestedWindow.startAt}`
    : '';

  return `Prepare a governed evidence pack for ${input.controlFamily} control ${input.targetRef} in ${input.environment}${windowSummary}.`;
}

function buildAssumptions(input: CreateChangeRequestInput): string[] {
  const assumptions = [
    `The cycle applies to control ${input.targetRef} in ${input.environment}.`,
    `Business owner ${input.businessOwner} can validate unresolved evidence questions.`,
  ];

  if (input.requestedWindow?.startAt && input.requestedWindow?.endAt) {
    assumptions.push('A bounded evidence collection period has been declared.');
  }

  return assumptions;
}

function buildMissingInformation(input: CreateChangeRequestInput): string[] {
  const missing: string[] = [];

  if (
    !input.sourceSystems.some((system) =>
      /(jira|servicenow|ticket|approval)/i.test(system),
    )
  ) {
    missing.push('No approval-system or ticketing source was declared for corroborating workflow evidence.');
  }

  if (!input.requestedWindow?.startAt || !input.requestedWindow?.endAt) {
    missing.push('Evidence collection period is incomplete.');
  }

  return missing;
}

function buildExpectedArtifacts(input: CreateChangeRequestInput): string[] {
  const artifacts = input.sourceSystems.map((system) =>
    `${system} evidence extract for ${input.targetRef}`,
  );

  artifacts.push(`Business owner attestation from ${input.businessOwner}`);
  artifacts.push(`${input.framework} control narrative draft`);

  return artifacts;
}

export function buildEvidenceArtifacts(
  normalizedRequest: NormalizedChangeRequest,
): EvidenceArtifact[] {
  const artifacts = normalizedRequest.sourceSystems.map((system, index) => {
    const recognizedSystem = /(okta|entra|azure ad|aws|gcp|jira|servicenow)/i.test(system);
    const ticketingSystem = /(jira|servicenow|ticket|approval)/i.test(system);

    return {
      id: `artifact-${index + 1}`,
      system,
      artifactType: ticketingSystem
        ? 'workflow-log'
        : recognizedSystem
          ? 'system-export'
          : 'manual-upload',
      title: `${system} control evidence`,
      description: ticketingSystem
        ? `Workflow and approval evidence from ${system}.`
        : recognizedSystem
          ? `System-generated evidence extract from ${system}.`
          : `Unstructured or analyst-supplied evidence from ${system}.`,
      status: recognizedSystem ? 'ready' : 'partial',
      freshness: recognizedSystem ? 'current' : 'aging',
      provenance: recognizedSystem
        ? `Connector snapshot captured from ${system}.`
        : `Analyst-declared source ${system} still needs provenance confirmation.`,
    } satisfies EvidenceArtifact;
  });

  return [
    ...artifacts,
    {
      id: 'artifact-owner-attestation',
      system: normalizedRequest.businessOwner,
      artifactType: 'owner-attestation',
      title: 'Control owner attestation',
      description: `Manual attestation expected from ${normalizedRequest.businessOwner}.`,
      status: 'partial',
      freshness: 'current',
      provenance: 'Pending reviewer acceptance of owner-supplied narrative.',
    },
  ];
}

export function buildEvidenceGaps(input: {
  artifacts: EvidenceArtifact[];
  normalizedRequest: NormalizedChangeRequest;
  requestedRiskLevel: CreateChangeRequestInput['riskLevel'];
}): EvidenceGap[] {
  const gaps: EvidenceGap[] = [];

  for (const artifact of input.artifacts) {
    if (artifact.status === 'ready') {
      continue;
    }

    gaps.push({
      id: `gap-${artifact.id}`,
      severity: artifact.artifactType === 'owner-attestation' ? 'medium' : 'high',
      title: `${artifact.title} is not audit-ready`,
      summary: `${artifact.title} still needs stronger provenance or completeness before it can support the control narrative.`,
      remediation: `Confirm provenance and provide a reviewer-acceptable export or attachment for ${artifact.system}.`,
      approvalRequired: input.requestedRiskLevel === 'high',
    });
  }

  for (const missing of input.normalizedRequest.missingInformation) {
    gaps.push({
      id: `gap-intake-${gaps.length + 1}`,
      severity: 'medium',
      title: 'Intake coverage gap',
      summary: missing,
      remediation: 'Collect the missing information before freezing the evidence pack.',
      approvalRequired: false,
    });
  }

  return gaps;
}

function buildAssessmentSummary(input: {
  action: PlannedAction;
  normalizedRequest: NormalizedChangeRequest;
  requestedRiskLevel: CreateChangeRequestInput['riskLevel'];
  posture: RiskPolicyAssessment['posture'];
}): string {
  const base = `${input.action.title} applies to control ${input.normalizedRequest.targetRef} in ${input.normalizedRequest.environment}.`;

  if (input.posture === 'review') {
    return `${base} Review is recommended because the cycle is ${input.requestedRiskLevel} sensitivity or still contains unresolved evidence gaps.`;
  }

  if (input.requestedRiskLevel === 'medium') {
    return `${base} Medium-sensitivity work can proceed only after the system policy posture is attached.`;
  }

  return `${base} This step is bounded, but the system policy engine still decides whether downstream exception handling would be allowed later.`;
}
