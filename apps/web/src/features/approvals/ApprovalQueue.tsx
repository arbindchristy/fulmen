import { Panel } from '../../components/Panel';

export function ApprovalQueue() {
  return (
    <Panel title="Approvals">
      <p>
        Approval paths are scaffolded for the MVP, but the real task flow is intentionally
        deferred until the governed vertical slice is implemented.
      </p>
      <ul>
        <li>Role-based local stub auth</li>
        <li>Approval route placeholder in API</li>
        <li>No production workflow logic yet</li>
      </ul>
    </Panel>
  );
}
