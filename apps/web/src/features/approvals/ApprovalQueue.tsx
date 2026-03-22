import { useEffect, useState } from 'react';

import type {
  ApprovalRequestDetail,
  ApprovalRequestListItem,
} from '@fulmen/contracts';

import { Panel } from '../../components/Panel';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

type ApprovalLoadState = 'idle' | 'loading' | 'ready' | 'error';
type DecisionState = 'idle' | 'submitting' | 'success' | 'error';

export function ApprovalQueue() {
  const [approvals, setApprovals] = useState<ApprovalRequestListItem[]>([]);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const [selectedApproval, setSelectedApproval] =
    useState<ApprovalRequestDetail | null>(null);
  const [loadState, setLoadState] = useState<ApprovalLoadState>('idle');
  const [decisionState, setDecisionState] = useState<DecisionState>('idle');
  const [decisionMessage, setDecisionMessage] = useState<string | null>(null);
  const [justification, setJustification] = useState(
    'Window confirmed. Human approval granted for the governed action.',
  );

  useEffect(() => {
    void loadApprovals();
  }, []);

  useEffect(() => {
    if (!selectedApprovalId) {
      setSelectedApproval(null);
      return;
    }

    void loadApprovalDetail(selectedApprovalId);
  }, [selectedApprovalId]);

  async function loadApprovals() {
    setLoadState('loading');

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/approvals`, {
        headers: {
          'x-fulmen-role': 'approver',
        },
      });

      if (!response.ok) {
        throw new Error(`Approval inbox failed with status ${response.status}.`);
      }

      const data = (await response.json()) as ApprovalRequestListItem[];
      setApprovals(data);
      setSelectedApprovalId((current) => current ?? data[0]?.id ?? null);
      setLoadState('ready');
    } catch (error) {
      setLoadState('error');
      setDecisionMessage(
        error instanceof Error ? error.message : 'Unknown approval inbox failure.',
      );
    }
  }

  async function loadApprovalDetail(approvalRequestId: string) {
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/approvals/${approvalRequestId}`,
        {
          headers: {
            'x-fulmen-role': 'approver',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Approval detail failed with status ${response.status}.`);
      }

      const data = (await response.json()) as ApprovalRequestDetail;
      setSelectedApproval(data);
    } catch (error) {
      setDecisionMessage(
        error instanceof Error ? error.message : 'Unknown approval detail failure.',
      );
    }
  }

  async function submitDecision(action: 'approve' | 'reject') {
    if (!selectedApproval) {
      return;
    }

    setDecisionState('submitting');
    setDecisionMessage(null);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/approvals/${selectedApproval.id}/${action}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-fulmen-role': 'approver',
          },
          body: JSON.stringify({
            justification,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Approval decision failed with status ${response.status}.`);
      }

      const data = (await response.json()) as ApprovalRequestDetail;
      setSelectedApproval(data);
      setDecisionState('success');
      setDecisionMessage(
        action === 'approve'
          ? 'Approval recorded.'
          : 'Rejection recorded.',
      );
      await loadApprovals();
    } catch (error) {
      setDecisionState('error');
      setDecisionMessage(
        error instanceof Error ? error.message : 'Unknown approval decision failure.',
      );
    }
  }

  return (
    <Panel title="Approval inbox">
      <p className="panel-intro">
        Pending approval-required actions are listed here in local approver mode.
      </p>

      <div className="approval-layout">
        <div className="approval-list">
          <div className={`approval-status approval-state-${loadState}`}>
            {approvalStatusLabel(loadState, approvals.length)}
          </div>

          {approvals.length === 0 && loadState === 'ready' ? (
            <p>No pending approvals.</p>
          ) : null}

          {approvals.map((approval) => (
            <button
              key={approval.id}
              className={`approval-list-item ${
                selectedApprovalId === approval.id ? 'approval-list-item-active' : ''
              }`}
              onClick={() => setSelectedApprovalId(approval.id)}
              type="button"
            >
              <strong>{approval.actionTitle}</strong>
              <span>{approval.changeRequestTitle}</span>
              <small>{approval.requestKey}</small>
            </button>
          ))}
        </div>

        <div className="approval-detail">
          {selectedApproval ? (
            <>
              <h3>{selectedApproval.actionTitle}</h3>
              <p>{selectedApproval.actionSummary}</p>
              <dl className="preview-metadata approval-metadata">
                <div>
                  <dt>Change request</dt>
                  <dd>{selectedApproval.changeRequest.title}</dd>
                </div>
                <div>
                  <dt>Assigned role</dt>
                  <dd>{selectedApproval.assignedRole}</dd>
                </div>
                <div>
                  <dt>System policy</dt>
                  <dd>{selectedApproval.policyDecision.decision}</dd>
                </div>
                <div>
                  <dt>Risk posture</dt>
                  <dd>{selectedApproval.riskAssessment.posture}</dd>
                </div>
              </dl>

              <h4>Risk context</h4>
              <p>{selectedApproval.riskAssessment.summary}</p>
              <ul>
                {selectedApproval.riskAssessment.factors.map((factor) => (
                  <li key={factor}>{factor}</li>
                ))}
              </ul>

              <label className="approval-justification">
                Decision justification
                <textarea
                  rows={3}
                  value={justification}
                  onChange={(event) => setJustification(event.target.value)}
                />
              </label>

              <div className="approval-actions">
                <button
                  className="approve-button"
                  disabled={
                    decisionState === 'submitting' ||
                    selectedApproval.status !== 'pending'
                  }
                  onClick={() => void submitDecision('approve')}
                  type="button"
                >
                  Approve
                </button>
                <button
                  className="reject-button"
                  disabled={
                    decisionState === 'submitting' ||
                    selectedApproval.status !== 'pending'
                  }
                  onClick={() => void submitDecision('reject')}
                  type="button"
                >
                  Reject
                </button>
              </div>

              {selectedApproval.decision ? (
                <p className="decision-note">
                  Decision: {selectedApproval.decision.decision} by{' '}
                  {selectedApproval.decision.decidedBy}
                </p>
              ) : null}
            </>
          ) : (
            <p>Select a pending approval to review its details.</p>
          )}

          {decisionMessage ? (
            <p className={`decision-feedback decision-${decisionState}`}>
              {decisionMessage}
            </p>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

function approvalStatusLabel(
  state: ApprovalLoadState,
  count: number,
): string {
  switch (state) {
    case 'loading':
      return 'Loading pending approvals';
    case 'ready':
      return `${count} pending approval${count === 1 ? '' : 's'}`;
    case 'error':
      return 'Approval inbox error';
    default:
      return 'Approval inbox idle';
  }
}
