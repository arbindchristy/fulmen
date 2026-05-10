import { useState, type FormEvent } from 'react';

import type {
  CreateChangeRequestInput,
  GovernedPreviewResponse,
} from '@fulmen/contracts';

import { Panel } from '../../components/Panel';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

interface FormState {
  title: string;
  controlFamily: string;
  framework: string;
  controlId: string;
  operatingArea: string;
  businessOwner: string;
  sourceSystems: string;
  controlDescription: string;
  auditObjective: string;
  evidenceSensitivity: CreateChangeRequestInput['riskLevel'];
  evidenceWindowStart: string;
  evidenceWindowEnd: string;
}

const initialFormState: FormState = {
  title: 'Quarterly access review evidence pack',
  controlFamily: 'Access Governance',
  framework: 'SOC 2 CC6.2',
  controlId: 'UGR-ACCESS-01',
  operatingArea: 'Global identity and SaaS administration',
  businessOwner: 'Head of Identity Operations',
  sourceSystems: 'Okta, Jira, AWS IAM Identity Center',
  controlDescription:
    'Assemble evidence showing privileged access reviews were performed, approved, and remediated within the declared period.',
  auditObjective:
    'Produce an audit-ready pack with linked artifacts, draft narrative, and explicit handling for unresolved evidence gaps.',
  evidenceSensitivity: 'high',
  evidenceWindowStart: '2026-05-01T00:00',
  evidenceWindowEnd: '2026-05-31T23:59',
};

interface ChangeRequestPanelProps {
  onPreviewCreated(preview: GovernedPreviewResponse): void;
  preview: GovernedPreviewResponse | null;
}

export function ChangeRequestPanel({
  onPreviewCreated,
  preview,
}: ChangeRequestPanelProps) {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionState('submitting');
    setErrorMessage(null);

    try {
      const payload: CreateChangeRequestInput = {
        title: form.title,
        controlFamily: form.controlFamily,
        framework: form.framework,
        description: form.controlDescription,
        rationale: form.auditObjective,
        businessOwner: form.businessOwner,
        sourceSystems: parseSystems(form.sourceSystems),
        riskLevel: form.evidenceSensitivity,
        targetRef: form.controlId,
        environment: form.operatingArea,
        requestedWindow:
          form.evidenceWindowStart || form.evidenceWindowEnd
            ? {
                startAt: toIsoDateTime(form.evidenceWindowStart),
                endAt: toIsoDateTime(form.evidenceWindowEnd),
              }
            : undefined,
      };

      const response = await fetch(`${apiBaseUrl}/api/v1/change-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Evidence cycle request failed with status ${response.status}.`);
      }

      const data = (await response.json()) as GovernedPreviewResponse;
      onPreviewCreated(data);
      setSubmissionState('success');
    } catch (error) {
      setSubmissionState('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Unknown preview error.',
      );
    }
  }

  return (
    <Panel title="Launch evidence cycle">
      <p className="panel-intro">
        Start with one control, one period, and a bounded set of source systems. The
        agents assemble a draft evidence pack, but the system preserves provenance,
        policy, approval, and audit authority.
      </p>

      <form className="change-request-form" onSubmit={handleSubmit}>
        <label>
          Cycle title
          <input
            required
            type="text"
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
          />
        </label>

        <div className="form-row">
          <label>
            Control family
            <input
              required
              type="text"
              value={form.controlFamily}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  controlFamily: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Framework or control ref
            <input
              required
              type="text"
              value={form.framework}
              onChange={(event) =>
                setForm((current) => ({ ...current, framework: event.target.value }))
              }
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            Control ID
            <input
              required
              type="text"
              value={form.controlId}
              onChange={(event) =>
                setForm((current) => ({ ...current, controlId: event.target.value }))
              }
            />
          </label>

          <label>
            Operating area
            <input
              required
              type="text"
              value={form.operatingArea}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  operatingArea: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            Business owner
            <input
              required
              type="text"
              value={form.businessOwner}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  businessOwner: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Evidence sensitivity
            <select
              value={form.evidenceSensitivity}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  evidenceSensitivity:
                    event.target.value as FormState['evidenceSensitivity'],
                }))
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>

        <label>
          Source systems
          <input
            required
            type="text"
            value={form.sourceSystems}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                sourceSystems: event.target.value,
              }))
            }
          />
        </label>

        <div className="form-row">
          <label>
            Evidence window start
            <input
              type="datetime-local"
              value={form.evidenceWindowStart}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  evidenceWindowStart: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Evidence window end
            <input
              type="datetime-local"
              value={form.evidenceWindowEnd}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  evidenceWindowEnd: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <label>
          Control description
          <textarea
            required
            rows={4}
            value={form.controlDescription}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                controlDescription: event.target.value,
              }))
            }
          />
        </label>

        <label>
          Audit objective
          <textarea
            required
            rows={3}
            value={form.auditObjective}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                auditObjective: event.target.value,
              }))
            }
          />
        </label>

        <div className="form-actions">
          <button disabled={submissionState === 'submitting'} type="submit">
            {submissionState === 'submitting'
              ? 'Building evidence pack...'
              : 'Generate governed evidence pack'}
          </button>
          <span className={`submission-state submission-${submissionState}`}>
            {submissionLabel(submissionState)}
          </span>
        </div>

        {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
      </form>

      {preview ? (
        <div className="preview-stack">
          <section className="preview-section">
            <div className="section-heading">
              <div>
                <h3>Cycle state</h3>
                <p>{preview.previewSummary}</p>
              </div>
              <span className={`status-chip status-${preview.changeRequest.status}`}>
                {formatStatus(preview.changeRequest.status)}
              </span>
            </div>

            <dl className="preview-metadata">
              <div>
                <dt>Cycle key</dt>
                <dd>{preview.changeRequest.requestKey}</dd>
              </div>
              <div>
                <dt>Framework</dt>
                <dd>{preview.changeRequest.framework}</dd>
              </div>
              <div>
                <dt>Control family</dt>
                <dd>{preview.changeRequest.controlFamily}</dd>
              </div>
              <div>
                <dt>Business owner</dt>
                <dd>{preview.changeRequest.businessOwner}</dd>
              </div>
            </dl>
          </section>

          <section className="preview-section">
            <h3>Evidence pack coverage</h3>
            <p>{preview.evidencePack.coverageSummary}</p>

            <div className="artifact-grid">
              {preview.evidencePack.artifacts.map((artifact) => (
                <article className="artifact-card" key={artifact.id}>
                  <div className="artifact-header">
                    <strong>{artifact.title}</strong>
                    <span className={`artifact-status artifact-${artifact.status}`}>
                      {formatStatus(artifact.status)}
                    </span>
                  </div>
                  <p>{artifact.description}</p>
                  <dl className="compact-metadata">
                    <div>
                      <dt>System</dt>
                      <dd>{artifact.system}</dd>
                    </div>
                    <div>
                      <dt>Freshness</dt>
                      <dd>{artifact.freshness}</dd>
                    </div>
                  </dl>
                  <small>{artifact.provenance}</small>
                </article>
              ))}
            </div>
          </section>

          <section className="preview-section">
            <h3>Draft narrative</h3>
            <p>{preview.evidencePack.narrativeDraft}</p>
            <ul className="action-list">
              {preview.normalizedRequest.expectedArtifacts.map((artifact) => (
                <li key={artifact}>{artifact}</li>
              ))}
            </ul>
          </section>

          <section className="preview-section">
            <h3>Open gaps and follow-ups</h3>
            {preview.evidencePack.gaps.length === 0 ? (
              <p>No material gaps detected in the current evidence pack.</p>
            ) : (
              <div className="gap-grid">
                {preview.evidencePack.gaps.map((gap) => (
                  <article className="gap-card" key={gap.id}>
                    <div className="gap-header">
                      <strong>{gap.title}</strong>
                      <span className={`severity-chip severity-${gap.severity}`}>
                        {gap.severity}
                      </span>
                    </div>
                    <p>{gap.summary}</p>
                    <small>{gap.remediation}</small>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="preview-section">
            <h3>Governed review workflow</h3>
            <div className="governed-action-list">
              {preview.governedActions.map((item) => (
                <article className="governed-action-card" key={item.action.id}>
                  <div className="card-header">
                    <div>
                      <h4>{item.action.title}</h4>
                      <p>{item.action.summary}</p>
                    </div>
                    <span
                      className={`approval-chip ${
                        item.approvalRequired
                          ? 'approval-required'
                          : 'approval-not-required'
                      }`}
                    >
                      {item.approvalRequired ? 'Approval gate' : 'System allowed'}
                    </span>
                  </div>

                  <p className="policy-line">
                    <strong>Risk posture:</strong> {item.riskAssessment.posture} (
                    {item.riskAssessment.riskLevel})
                  </p>
                  <p className="policy-line">
                    <strong>System policy:</strong> {item.policyDecision.decision} (
                    {item.policyDecision.reasonCode})
                  </p>
                  {item.approvalRequest ? (
                    <>
                      <p className="policy-line">
                        Review request: <strong>{item.approvalRequest.id}</strong> for role{' '}
                        <strong>{item.approvalRequest.assignedRole}</strong>
                      </p>
                      <p className="policy-line">
                        Review status:{' '}
                        <span className={`status-chip status-${item.approvalRequest.status}`}>
                          {formatStatus(item.approvalRequest.status)}
                        </span>
                      </p>
                    </>
                  ) : null}
                  {item.approvalDecision ? (
                    <div className="decision-record">
                      <h4>Decision record</h4>
                      <p>
                        <strong>Status:</strong> {formatStatus(item.approvalDecision.decision)}
                      </p>
                      <p>
                        <strong>Actor:</strong> {item.approvalDecision.decidedBy}
                      </p>
                      <p>
                        <strong>Timestamp:</strong>{' '}
                        {formatDateTime(item.approvalDecision.decidedAt)}
                      </p>
                      <p>
                        <strong>Justification:</strong>{' '}
                        {item.approvalDecision.justification}
                      </p>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </Panel>
  );
}

function parseSystems(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toIsoDateTime(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return new Date(value).toISOString();
}

function formatStatus(value: string): string {
  return value.replace(/_/g, ' ');
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

function submissionLabel(state: SubmissionState): string {
  switch (state) {
    case 'submitting':
      return 'Building evidence pack';
    case 'success':
      return 'Evidence pack ready';
    case 'error':
      return 'Preview failed';
    default:
      return 'Ready for cycle intake';
  }
}
