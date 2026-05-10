# Workflow

## End-to-end user workflow
1. A buyer opens a new deal room or imports a renewal package.
2. The Clause Mapper Agent breaks the contract set into negotiable issues and maps each issue to playbooks and precedent.
3. The Strategy Agent drafts an opening position, fallback positions, and non-negotiables.
4. The user edits the strategy, runs a concession package simulation, and chooses a preferred path.
5. The Redline Agent drafts document changes consistent with the chosen strategy.
6. The system checks deviations against approval rules for price, indemnity, data handling, term length, or security exceptions.
7. Humans approve or reject exceptions, then export the package to the counterparty.
8. Incoming redlines are re-ingested and the cycle repeats with a preserved decision trail.

## Where agents are used
- Clause extraction and issue clustering
- Precedent retrieval and fallback drafting
- Concession package generation
- Counterparty redline interpretation and negotiation brief creation

## Where system controls are used
- Playbook enforcement and deviation checks
- Approval routing for commercial or legal exceptions
- Privilege-aware document access and matter scoping
- Audit logging of proposed and accepted concessions

## Where human decisions remain
- Setting negotiation posture and relationship strategy
- Approving material deviations from standard positions
- Making the final decision on what to send externally
- Escalating deals that exceed delegated authority
