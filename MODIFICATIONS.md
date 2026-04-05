---
name: live-progress-sse
overview: Add live backend progress (stage + line-by-line logs) to your existing Next.js agent run, using SSE while keeping everything in the same Next.js server (no separate worker).
todos:
  - id: job-store
    content: Add in-memory job/event store module (Map keyed by jobId).
    status: completed
  - id: run-start-endpoint
    content: Refactor `app/api/run/route.ts` to return `{ jobId }` (202) and start agent asynchronously using `agentRunner.stream`.
    status: completed
  - id: sse-events-endpoint
    content: Create `app/api/run/events/route.ts` SSE endpoint to stream `progress`/`log`/`done` events for a jobId.
    status: completed
  - id: graph-progress-emits
    content: Update `app/lib/agentGraph.ts` nodes to accept `(state, config)` and emit stage progress via LangGraph `config.writer` custom events.
    status: completed
  - id: tools-line-logs
    content: Refactor `app/lib/agentTools.ts` install/tests execution from `exec` to `spawn` and emit line-by-line stdout/stderr to the graph progress writer.
    status: completed
  - id: ui-live-progress
    content: "Update UI page wiring: render config+progress+results together; connect to SSE from `app/components/Dashboard.tsx` and pass final payload into Results UI."
    status: completed
  - id: payload-contract
    content: Ensure backend `done` event payload matches the existing `AgentData` shape used by `Results.tsx` and `FixesTable.tsx`.
    status: completed
isProject: false
---

## Goal

Users should see real-time progress updates and logs while the agent pipeline runs (clone → analyze → test/exec output → fix → commit), and finally render the same `AgentData` payload your UI already expects.

## High-level approach (stay in current architecture)

- Keep the agent pipeline (`agentGraph.ts` + `agentTools.ts`) running on the same Next.js server.
- Change `/api/run` to start the pipeline asynchronously and return a `jobId` immediately.
- Add an SSE endpoint like `/api/run/events?jobId=...` that streams progress/log events to the browser.
- Use LangGraph streaming/custom events to emit stage transitions, and stream command output line-by-line from `agentTools.ts`.
- Update the dashboard page/UI so it actually triggers the run and renders progress + final results.

## Data flow

```mermaid
graph TD
  A[Browser Dashboard UI] -->|POST /api/run| B[Next.js API Route]
  B -->|returns jobId| A
  A -->|SSE GET /api/run/events?jobId=...| C[SSE Route]
  C -->|streams events| A
  A -->|when done event arrives| D[Render existing Results UI]

  B --> E[Run agentRunner.stream(...)]
  E -->|emit stage + logs| F[In-memory job event buffer]
  F -->|SSE reads buffer| C
```



## Implementation steps

### 1) Introduce a lightweight in-memory job store

Create a module like `[app/lib/progressStore.ts]` to hold:

- `job.status` (`QUEUED | RUNNING | PASSED | FAILED`)
- `job.events` (queue of SSE-ready events)
- `job.finalResult` (the `genuineResult` payload shaped like your current UI expects)

This keeps the change self-contained while you iterate.

### 2) Modify `/api/run` to return `jobId` and run asynchronously

Update `[app/api/run/route.ts]`:

- Change the POST handler so it no longer `await agentRunner.invoke(...)`.
- Instead:
  - Create `jobId`
  - Kick off `runJob(jobId, {repoUrl, teamName, leaderName})` in the background (do not await)
  - Return `{ jobId }` with HTTP `202`.

Important: to reliably support background tasks + SSE, ensure the route runs in the Node runtime (not Edge) and assume a long-lived server process.

### 3) Add an SSE route that streams job events

Add a new API route (example):

- `[app/api/run/events/route.ts]`

The handler should:

- Read `jobId` from query params
- Create an SSE `ReadableStream`
- Subscribe/poll the in-memory `job.events` queue
- For each event, write a line in SSE format like:
  - `event: progress` / `event: log` / `event: done`
  - `data: JSON.stringify(payload)`
- Close the stream when `done` is sent.

### 4) Stream progress from LangGraph using `agentRunner.stream`

Update `[app/lib/agentGraph.ts]` so nodes emit progress events during execution.

Key changes:

- Switch from `agentRunner.invoke(...)` to `agentRunner.stream(...)` inside the background `runJob` function (in the `/api/run` handler).
- In each node (`setupNode`, `analyzeNode`, `testNode`, `fixNode`, `commitNode`), accept `(state, config)` and use the LangGraph runnable config writer to emit `custom` events.

Concretely:

- Configure streaming with `streamMode: ["updates", "custom"]` (and optionally `"tools"` if you refactor commands into LangChain tools later).
- Emit events like:
  - `{ type: "stage", stage: "setup", message: "Cloning repository" }`
  - `{ type: "stage", stage: "analyze", message: "Analyzing repo structure" }`
  - etc.

### 5) Stream test/install logs line-by-line from `agentTools.ts`

Right now `[app/lib/agentTools.ts]` uses `execAsync`, which only gives output after completion.

To support “line-by-line logs”, refactor `runTests` (and install step) to:

- Use `child_process.spawn` instead of `exec`
- Capture stdout/stderr `data` events
- Split into lines and emit each line via the same progress writer (or a callback passed from the graph node)

This is the core change that makes “live logs” truly real-time.

### 6) Update UI so the dashboard actually runs and shows live progress

Today:

- `[app/components/Dashboard.tsx]` has run-button logic, but `[app/dashboard/page.tsx]` renders only `[app/components/Results.tsx]`.

To deliver live progress:

- Update `[app/dashboard/page.tsx]` to render a single composed client page that includes:
  - the existing configuration UI (`repoUrl/teamName/leaderName` inputs + `Run Agent` button)
  - a progress panel (current stage + a log viewer)
  - and the existing Results cards (rendered when the SSE stream sends `done` with final payload)

Optionally, adjust `[app/components/Results.tsx]` to accept props (so it can display `agentData` passed from SSE) instead of owning its own unused state.

### 7) Wire the client to SSE

Update the run button handler in `[app/components/Dashboard.tsx]`:

- After `POST /api/run`, read `{ jobId }`
- Create an `EventSource` pointing to `/api/run/events?jobId=${jobId}`
- On incoming events:
  - append log lines
  - update progress stage
  - on `done`, call `setAgentData(finalPayload)` so your existing UI renders fixes, score, and NO_TESTS warning.

### 8) Finalize event payload shape to match your existing UI

Ensure the `done` payload produced by the backend matches your current UI expectation:

- `status` (including `NO_TESTS` special case)
- `summary` (branchName, totalFixes, totalFailures, timeTaken)
- `analysis` (installCmd, testCmd, testCoverageScore)
- `score` (base/speedBonus/efficiencyPenalty/final)
- `fixes`

Your current scoring logic lives in `[app/api/run/route.ts]`; keep it, but move it into the job completion step that runs after the streamed execution finishes.

## Files you will likely touch

- `[app/api/run/route.ts]` (return jobId, start background run)
- `[app/api/run/events/route.ts]` (new SSE endpoint)
- `[app/lib/progressStore.ts]` (new in-memory job/events buffer)
- `[app/lib/agentGraph.ts]` (emit progress via `config.writer`, use `stream`)
- `[app/lib/agentTools.ts]` (refactor exec → spawn for line-by-line logs)
- `[app/components/Dashboard.tsx]` (connect to SSE and render logs/progress)
- `[app/components/Results.tsx]` and/or `[app/dashboard/page.tsx]` (ensure correct rendering wiring)

## Risks / constraints (callouts)

- Running long tasks inside Next.js request handling depends on deployment environment. Background execution + SSE generally works best on a traditional Node server, not Edge/serverless where the process may freeze.
- Streaming line-by-line logs requires changing command execution from `exec` to `spawn`.
- The in-memory store is not durable; refreshing the page will lose progress unless you persist jobs to a DB.

## Suggested minimal acceptance criteria

- Click “Run Agent” → browser shows stage transitions and streamed stdout/stderr lines while tests/install run.
- When pipeline finishes, existing Results UI renders the same `genuineResult` payload (fixes table, score, NO_TESTS banner).

