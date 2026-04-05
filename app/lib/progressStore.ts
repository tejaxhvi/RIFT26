import type { FixRecord } from "@/app/components/dashboard/FixesTable";

export type AgentData = {
  status: string;
  summary: {
    repoUrl: string;
    teamName: string;
    leaderName: string;
    branchName: string;
    totalFailures: number;
    totalFixes: number;
    timeTaken: string;
  };
  analysis: {
    installCmd: string;
    testCmd: string;
    testCoverageScore: number;
  };
  score: {
    base: number;
    speedBonus: number;
    efficiencyPenalty: number;
    final: number;
  };
  fixes: FixRecord[];
};

export type ProgressStage = "setup" | "analyze" | "test" | "fix" | "commit" | "done";

export type ProgressEvent =
  | { type: "stage"; stage: ProgressStage; message?: string; iteration?: number }
  | { type: "log"; stream: "stdout" | "stderr" | "system"; line: string }
  | { type: "done"; payload: AgentData }
  | { type: "error"; message: string };

export type JobStatus = "QUEUED" | "RUNNING" | "DONE" | "ERROR";

type Job = {
  id: string;
  status: JobStatus;
  events: ProgressEvent[];
  finalResult?: AgentData;
  error?: string;
  createdAt: number;
  updatedAt: number;
  listeners: Set<(event: ProgressEvent) => void>;
};

const jobs = new Map<string, Job>();

function getOrCreateJob(jobId: string): Job {
  const existing = jobs.get(jobId);
  if (existing) return existing;
  const createdAt = Date.now();
  const job: Job = {
    id: jobId,
    status: "QUEUED",
    events: [],
    createdAt,
    updatedAt: createdAt,
    listeners: new Set(),
  };
  jobs.set(jobId, job);
  return job;
}

export function createJob(jobId: string) {
  const existing = jobs.get(jobId);
  if (existing) return existing;
  return getOrCreateJob(jobId);
}

export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId);
}

export function setJobStatus(jobId: string, status: JobStatus) {
  const job = getOrCreateJob(jobId);
  job.status = status;
  job.updatedAt = Date.now();
}

export function appendEvent(jobId: string, event: ProgressEvent) {
  const job = getOrCreateJob(jobId);
  job.events.push(event);
  job.updatedAt = Date.now();
  for (const listener of job.listeners) {
    try {
      listener(event);
    } catch {
      // Ignore listener failures so the agent isn't blocked.
    }
  }
}

export function onJobEvent(jobId: string, listener: (event: ProgressEvent) => void) {
  const job = getOrCreateJob(jobId);
  job.listeners.add(listener);
  return () => {
    job.listeners.delete(listener);
  };
}

