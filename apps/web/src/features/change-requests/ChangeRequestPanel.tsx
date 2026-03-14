import { Panel } from '../../components/Panel';

export function ChangeRequestPanel() {
  return (
    <Panel title="Change requests">
      <p>
        The first implementation will support one governed change-control workflow with
        draft, preview, and review states.
      </p>
      <ul>
        <li>Single workflow family</li>
        <li>No generic agent builder</li>
        <li>Structured plan preview only</li>
      </ul>
    </Panel>
  );
}
