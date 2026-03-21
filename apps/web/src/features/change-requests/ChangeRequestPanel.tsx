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
  description: string;
  rationale: string;
  riskLevel: CreateChangeRequestInput['riskLevel'];
  targetRef: string;
  environment: string;
  requestedWindowStart: string;
  requestedWindowEnd: string;
}

const initialFormState: FormState = {
  title: 'Restart edge router',
  description:
    'Restart router-01 during the approved maintenance window and confirm routing health afterwards.',
  rationale: 'Recover from a stuck routing process before business traffic increases.',
  riskLevel: 'high',
  targetRef: 'router-01',
  environment: 'production',
  requestedWindowStart: '2026-03-22T01:00',
  requestedWindowEnd: '2026-03-22T02:00',
};

export function ChangeRequestPanel() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<GovernedPreviewResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionState('submitting');
    setErrorMessage(null);

    try {
      const payload: CreateChangeRequestInput = {
        title: form.title,
        description: form.description,
        rationale: form.rationale,
        riskLevel: form.riskLevel,
        targetRef: form.targetRef,
        environment: form.environment,
        requestedWindow:
          form.requestedWindowStart || form.requestedWindowEnd
            ? {
                startAt: toIsoDateTime(form.requestedWindowStart),
                endAt: toIsoDateTime(form.requestedWindowEnd),
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
        throw new Error(`Preview request failed with status ${response.status}.`);
      }

      const data = (await response.json()) as GovernedPreviewResponse;
      setPreview(data);
      setSubmissionState('success');
    } catch (error) {
      setSubmissionState('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Unknown preview error.',
      );
    }
  }

  return (
    <Panel title="Submit change request">
      <form className="change-request-form" onSubmit={handleSubmit}>
        <label>
          Title
          <input
            required
            type="text"
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
          />
        </label>

        <label>
          Target reference
          <input
            required
            type="text"
            value={form.targetRef}
            onChange={(event) =>
              setForm((current) => ({ ...current, targetRef: event.target.value }))
            }
          />
        </label>

        <div className="form-row">
          <label>
            Environment
            <input
              required
              type="text"
              value={form.environment}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  environment: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Declared risk
            <select
              value={form.riskLevel}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  riskLevel: event.target.value as FormState['riskLevel'],
                }))
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            Window start
            <input
              type="datetime-local"
              value={form.requestedWindowStart}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  requestedWindowStart: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Window end
            <input
              type="datetime-local"
              value={form.requestedWindowEnd}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  requestedWindowEnd: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <label>
          Request description
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
        </label>

        <label>
          Rationale
          <textarea
            required
            rows={3}
            value={form.rationale}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                rationale: event.target.value,
              }))
            }
          />
        </label>

        <div className="form-actions">
          <button disabled={submissionState === 'submitting'} type="submit">
            {submissionState === 'submitting'
              ? 'Generating governed preview...'
              : 'Submit and preview'}
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
            <h3>Intake Agent</h3>
            <p>{preview.normalizedRequest.operatorIntentSummary}</p>
            <dl className="preview-metadata">
              <div>
                <dt>Category</dt>
                <dd>{preview.normalizedRequest.changeCategory}</dd>
              </div>
              <div>
                <dt>Requested outcome</dt>
                <dd>{preview.normalizedRequest.requestedOutcome}</dd>
              </div>
            </dl>
            {preview.normalizedRequest.missingInformation.length > 0 ? (
              <>
                <h4>Missing information</h4>
                <ul>
                  {preview.normalizedRequest.missingInformation.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>

          <section className="preview-section">
            <h3>Planning Agent</h3>
            <p>{preview.actionPlan.summary}</p>
            <ol className="action-list">
              {preview.actionPlan.actions.map((action) => (
                <li key={action.id}>
                  <strong>{action.title}</strong>
                  <p>{action.summary}</p>
                  <small>{action.rationale}</small>
                </li>
              ))}
            </ol>
          </section>

          <section className="preview-section">
            <h3>Risk &amp; Policy Agent + system policy</h3>
            <p>{preview.previewSummary}</p>
            <div className="governed-action-list">
              {preview.governedActions.map((item) => (
                <article key={item.action.id} className="governed-action-card">
                  <div className="card-header">
                    <strong>{item.action.title}</strong>
                    <span
                      className={`approval-chip approval-${
                        item.approvalRequired ? 'required' : 'not-required'
                      }`}
                    >
                      {item.approvalRequired
                        ? 'Approval required'
                        : 'No approval required'}
                    </span>
                  </div>
                  <p>{item.riskAssessment.summary}</p>
                  <ul>
                    {item.riskAssessment.factors.map((factor) => (
                      <li key={factor}>{factor}</li>
                    ))}
                  </ul>
                  <p className="policy-line">
                    System policy decision: <strong>{item.policyDecision.decision}</strong>{' '}
                    ({item.policyDecision.reasonCode})
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </Panel>
  );
}

function toIsoDateTime(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return new Date(value).toISOString();
}

function submissionLabel(state: SubmissionState): string {
  switch (state) {
    case 'submitting':
      return 'Calling API';
    case 'success':
      return 'Preview ready';
    case 'error':
      return 'Preview failed';
    default:
      return 'Awaiting submission';
  }
}
