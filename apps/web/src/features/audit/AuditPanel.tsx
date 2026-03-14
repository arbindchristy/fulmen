import { Panel } from '../../components/Panel';

export function AuditPanel() {
  return (
    <Panel title="Audit and evidence">
      <p>
        Auditability remains a first-class requirement in the scaffold. The API and service
        modules already preserve a dedicated audit boundary and local evidence root.
      </p>
      <ul>
        <li>Append-only audit event contract</li>
        <li>Local filesystem evidence placeholder</li>
        <li>Read APIs scaffolded but not implemented</li>
      </ul>
    </Panel>
  );
}
