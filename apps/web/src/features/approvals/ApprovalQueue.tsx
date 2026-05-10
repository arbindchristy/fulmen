import { useEffect, useState } from 'react';

import type {
  ApprovalRequestDetail,
  ApprovalRequestListItem,
} from '@fulmen/contracts';

import { Panel } from '../../components/Panel';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

type ApprovalLoadState = 'idle' | 'loading' | 'ready' | 'error';
type DecisionState = 'idle' | 'submitting' | 'success' | 'error';

interface ApprovalQueueProps {
  onApprovalResolved(approval: ApprovalRequestDetail): void;
}

export function ApprovalQueue({ onApprovalResolved }: ApprovalQueueProps) {
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequestListItem[]>([]);
  const [recentlyDecided, setRecentlyDecided] = useState<ApprovalRequestDetail[]>([]);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const [selectedApproval, setSelectedApproval] =
    useState<ApprovalRequestDetail | null>(null);
  const [selectedScope, setSelectedScope] = useState<'pending' | 'decided' | null>(null);
  const [loadState, setLoadState] = useState<ApprovalLoadState>('idle');
  const [decisionState, setDecisionState] = useState<DecisionState>('idle');
  const [decisionMessage, setDecisionMessage] = useState<string | null>(null);
  const [justification, setJustification] = useState(
    'Evidence gaps are understood, provenance is acceptable for the period, and the compensating narrative is sufficient for approval.',
  );

  useEffect(() => {
    void loadApprovals();
  }, []);

  useEffect(() => {
    if (!selectedApprovalId || selectedScope !== 'pending') {
      return;
    }

    void loadApprovalDetail(selectedApprovalId);
  }, [selectedApprovalId, selectedScope]);

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
      setPendingApprovals(data);
      setLoadState('ready');

      if (data.length > 0 && (!selectedApprovalId || selectedScope !== 'pending')) {
        setSelectedApprovalId(data[0]?.id ?? null);
        setSelectedScope('pending');
      }

      if (data.length === 0 && selectedScope === 'pending') {
        if (recentlyDecided.length > 0) {
          setSelectedApproval(recentlyDecided[0] ?? null);
          setSelectedApprovalId(recentlyDecided[0]?.id ?? null);
          setSelectedScope('decided');
        } else {
          setSelectedApproval(null);
          setSelectedApprovalId(null);
          setSelectedScope(null);
        }
      }
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
      setDecisionState('idle');
      setDecisionMessage(null);
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
      setSelectedApprovalId(data.id);
      setSelectedScope('decided');
      setDecisionState('success');
      setDecisionMessage(
        action === 'approve'
          ? 'Exception approval recorded.'
          : 'Exception rejection recorded.',
      );
      setRecentlyDecided((current) => [
        data,
        ...current.filter((item) => item.id !== data.id),
      ].slice(0, 5));
      onApprovalResolved(data);
      await loadApprovals();
    } catch (error) {
      setDecisionState('error');
      setDecisionMessage(
        error instanceof Error ? error.message : 'Unknown approval decision failure.',
      );
    }
  }

  return (
    <Panel title="Exception approvals">
      <p className="panel-intro">
        High-sensitivity evidence gaps stay governed. Approvers see the control
        context, risk summary, and policy basis before accepting any exception.
      </p>

      <div className="approval-layout">
        <div className="approval-list">
          <section className="approval-group">
            <div className={`approval-status approval-state-${loadState}`}>
              {approvalStatusLabel(loadState, pendingApprovals.length)}
            </div>

            {pendingApprovals.length === 0 && loadState === 'ready' ? (
              <p>No pending exception approvals.</p>
            ) : null}

            {pendingApprovals.map((approval) => (
              <button
                key={approval.id}
                className={`approval-list-item ${
                  selectedApprovalId === approval.id && selectedScope === 'pending'
                    ? 'approval-list-item-active'
                    : ''
                }`}
                onClick={() => {
                  setSelectedApprovalId(approval.id);
                  setSelectedScope('pending');
                }}
                type="button"
              >
                <strong>{approval.actionTitle}</strong>
                <span>{approval.changeRequestTitle}</span>
                <small>{approval.requestKey}</small>
              </button>
            ))}
          </section>

          <section className="approval-group">
            <h3 className="approval-group-title">Recently decided</h3>
            {recentlyDecided.length === 0 ? (
              <p>No recent decisions in this session.</p>
            ) : null}

            {recentlyDecided.map((approval) => (
              <button
                key={approval.id}
                className={`approval-list-item ${
                  selectedApprovalId === approval.id && selectedScope === 'decided'
                    ? 'approval-list-item-active'
                    : ''
                }`}
                onClick={() => {
                  setSelectedApproval(approval);
                  setSelectedApprovalId(approval.id);
                  setSelectedScope('decided');
                  setDecisionState('idle');
                }}
                type="button"
              >
                <strong>{approval.actionTitle}</strong>
                <span>{approval.changeRequest.title}</span>
                <small>{formatStatus(approval.status)}</small>
              </button>
            ))}
          </section>
        </div>

        <div className="approval-detail">
          {selectedApproval ? (
            <>
              <div className="approval-detail-header">
                <div>
                  <h3>{selectedApproval.actionTitle}</h3>
                  <p>{selectedApproval.actionSummary}</p>
                </div>
                <span className={`status-chip status-${selectedApproval.status}`}>
                  {formatStatus(selectedApproval.status)}
                </span>
              </div>

              <p className="approval-panel-label">
                {selectedApproval.status === 'pending'
                  ? 'Pending exception approval'
                  : 'Recorded exception decision'}
              </p>

              <dl className="preview-metadata approval-metadata">
                <div>
                  <dt>Evidence cycle</dt>
                  <dd>{selectedApproval.changeRequest.title}</dd>
                </div>
                <div>
                  <dt>Framework</dt>
                  <dd>{selectedApproval.changeRequest.framework}</dd>
                </div>
                <div>
                  <dt>Control</dt>
                  <dd>{selectedApproval.changeRequest.targetRef}</dd>
                </div>
                <div>
                  <dt>Assigned role</dt>
                  <dd>{selectedApproval.assignedRole}</dd>
                </div>
              </dl>

              <h4>Risk context</h4>
              <p>{selectedApproval.riskAssessment.summary}</p>
              <ul>
                {selectedApproval.riskAssessment.factors.map((factor) => (
                  <li key={factor}>{factor}</li>
                ))}
              </ul>

              <p className="policy-line">
                <strong>System policy basis:</strong> {selectedApproval.policyDecision.explanation}
              </p>

              {selectedApproval.status === 'pending' ? (
                <>
                  <label className="approval-justification">
                    Approval justification
                    <textarea
                      rows={4}
                      value={justification}
                      onChange={(event) => setJustification(event.target.value)}
                    />
                  </label>

                  <div className="approval-actions">
                    <button
                      className="approve-button"
                      disabled={decisionState === 'submitting'}
                      onClick={() => void submitDecision('approve')}
                      type="button"
                    >
                      Approve exception
                    </button>
                    <button
                      className="reject-button"
                      disabled={decisionState === 'submitting'}
                      onClick={() => void submitDecision('reject')}
                      type="button"
                    >
                      Reject exception
                    </button>
                  </div>
                </>
              ) : selectedApproval.decision ? (
                <div className="decision-record">
                  <h4>Decision record</h4>
                  <p>
                    <strong>Status:</strong> {formatStatus(selectedApproval.decision.decision)}
                  </p>
                  <p>
                    <strong>Actor:</strong> {selectedApproval.decision.decidedBy}
                  </p>
                  <p>
                    <strong>Justification:</strong> {selectedApproval.decision.justification}
                  </p>
                </div>
              ) : null}

              {decisionMessage ? (
                <p className={`decision-message decision-${decisionState}`}>
                  {decisionMessage}
                </p>
              ) : null}
            </>
          ) : (
            <p>Select an approval record to inspect it.</p>
          )}
        </div>
      </div>
    </Panel>
  );
}

function approvalStatusLabel(
  state: ApprovalLoadState,
  pendingCount: number,
): string {
  switch (state) {
    case 'loading':
      return 'Loading pending approvals...';
    case 'error':
      return 'Approval inbox unavailable';
    case 'ready':
      return pendingCount > 0
        ? `${pendingCount} pending exception approval${pendingCount === 1 ? '' : 's'}`
        : 'Approval inbox clear';
    default:
      return 'Approval inbox idle';
  }
}

function formatStatus(value: string): string {
  return value.replace(/_/g, ' ');
}
