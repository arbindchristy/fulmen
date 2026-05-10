import { useEffect, useState } from 'react';

import type {
  ApprovalRequestDetail,
  GovernedPreviewResponse,
} from '@fulmen/contracts';

import { ApprovalQueue } from '../features/approvals/ApprovalQueue';
import { AuditPanel } from '../features/audit/AuditPanel';
import { ChangeRequestPanel } from '../features/change-requests/ChangeRequestPanel';

interface HealthState {
  status: 'idle' | 'loading' | 'ok' | 'error';
  message: string;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export function App() {
  const [health, setHealth] = useState<HealthState>({
    status: 'idle',
    message: 'Waiting for API check.',
  });
  const [activePreview, setActivePreview] =
    useState<GovernedPreviewResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      setHealth({
        status: 'loading',
        message: 'Checking ControlProof API health.',
      });

      try {
        const response = await fetch(`${apiBaseUrl}/healthz`);

        if (!response.ok) {
          throw new Error(`Health check failed with status ${response.status}`);
        }

        const payload = (await response.json()) as { status: string };

        if (!cancelled) {
          setHealth({
            status: 'ok',
            message: `API responded with status "${payload.status}".`,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setHealth({
            status: 'error',
            message:
              error instanceof Error ? error.message : 'Unknown health check failure.',
          });
        }
      }
    }

    void loadHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  const approvalCount =
    activePreview?.governedActions.filter((action) => action.approvalRequired)
      .length ?? 0;
  const openGapCount =
    activePreview?.evidencePack.gaps.filter((gap) => gap.severity !== 'low').length ??
    0;

  return (
    <main className="page-shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">ControlProof Alpha</p>
          <h1>Governed evidence operations for audit-ready control proof</h1>
          <p className="subtitle">
            Build a control evidence cycle, review sourced artifacts, route exception
            approvals, and preserve an audit trail from intake to frozen narrative.
          </p>
        </div>

        <div className="hero-sidebar">
          <div className={`health health-${health.status}`}>{health.message}</div>
          <div className="hero-metrics">
            <article>
              <strong>{activePreview?.evidencePack.artifacts.length ?? 0}</strong>
              <span>Artifacts in active pack</span>
            </article>
            <article>
              <strong>{openGapCount}</strong>
              <span>Open material gaps</span>
            </article>
            <article>
              <strong>{approvalCount}</strong>
              <span>Governed reviews</span>
            </article>
          </div>
        </div>
      </header>

      <section className="primary-panel">
        <ChangeRequestPanel
          preview={activePreview}
          onPreviewCreated={setActivePreview}
        />
      </section>

      <section className="grid secondary-grid">
        <ApprovalQueue
          onApprovalResolved={(approval) => {
            setActivePreview((current) =>
              current ? mergeApprovalIntoPreview(current, approval) : current,
            );
          }}
        />
        <AuditPanel entityId={activePreview?.changeRequest.id ?? null} />
      </section>
    </main>
  );
}

function mergeApprovalIntoPreview(
  preview: GovernedPreviewResponse,
  approval: ApprovalRequestDetail,
): GovernedPreviewResponse {
  if (preview.changeRequest.id !== approval.changeRequest.id) {
    return preview;
  }

  return {
    ...preview,
    changeRequest: {
      ...preview.changeRequest,
      status: approval.changeRequest.status,
    },
    governedActions: preview.governedActions.map((governedAction) => {
      if (governedAction.action.id !== approval.action.id) {
        return governedAction;
      }

      return {
        ...governedAction,
        approvalRequest: {
          id: approval.id,
          tenantId: approval.tenantId,
          changeRequestId: approval.changeRequestId,
          status: approval.status,
          assignedRole: approval.assignedRole,
          assignedUserId: approval.assignedUserId,
          actionId: approval.actionId,
          actionTitle: approval.actionTitle,
          actionSummary: approval.actionSummary,
          actionType: approval.actionType,
          resourceRef: approval.resourceRef,
          createdAt: approval.createdAt,
        },
        approvalDecision: approval.decision,
      };
    }),
  };
}
