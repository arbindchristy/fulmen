# @fulmen/orchestrator

Workflow orchestration module for the Fulmen MVP.

## Purpose
- Coordinate guarded planning, policy checks, approval waits, and tool gateway calls
- Preserve the state-machine seam for the future governed workflow
- Keep the initial implementation in-process behind `apps/api`

## Not implemented yet
- Durable workflow execution
- Resume logic after process restart
- Full change-request business workflow
