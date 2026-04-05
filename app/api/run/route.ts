import { NextResponse } from "next/server";
import { agentRunner } from "@/app/lib/agentGraph";
import { appendEvent, createJob, setJobStatus } from "@/app/lib/progressStore";
import type { ProgressEvent, ProgressStage } from "@/app/lib/progressStore";
import { randomUUID } from "crypto";
import type { FixRecord } from "@/app/components/dashboard/FixesTable";

type GraphRunState = {
  repoUrl: string;
  teamName: string;
  leaderName: string;
  repoPath?: string;
  repoStructure?: string;
  installCmd?: string;
  testCmd?: string;
  testScore?: number;
  errorLog: string;
  fixes: FixRecord[];
  iterations: number;
  finalStatus?: string;
};

function isProgressEvent(value: unknown): value is ProgressEvent {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  const t = obj.type;
  if (typeof t !== "string") return false;
  return t === "stage" || t === "log" || t === "done" || t === "error";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { repoUrl, teamName, leaderName } = body;

    if (!repoUrl || !teamName || !leaderName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const jobId = randomUUID();
    createJob(jobId);
    setJobStatus(jobId, "QUEUED");

    void (async () => {
      const startTime = Date.now();

      try {
        setJobStatus(jobId, "RUNNING");
        console.log(`Starting autonomous agent workflow for ${repoUrl} (jobId: ${jobId})...`);

        const inputs = { repoUrl, teamName, leaderName };

        // Local state reconstruction from streaming "updates"
        const state: GraphRunState = {
          repoUrl,
          teamName,
          leaderName,
          repoPath: undefined,
          repoStructure: undefined,
          installCmd: undefined,
          testCmd: undefined,
          testScore: undefined,
          errorLog: "",
          fixes: [],
          iterations: 0,
          finalStatus: undefined,
        };

        const nodeNameToStage: Record<string, ProgressStage | undefined> = {
          setup: "setup",
          analyze: "analyze",
          test: "test",
          fix: "fix",
          commitNode: "commit",
        };

        const stream = await agentRunner.stream(inputs, {
          streamMode: ["updates", "custom"],
        });

        let sawCustomStage = false;

        for await (const chunk of stream) {
          const c: unknown = chunk;

          if (isProgressEvent(c)) {
            if (c.type === "stage") sawCustomStage = true;
            appendEvent(jobId, c);
            continue;
          }

          // "updates" payload: object mapping nodeName -> partial update
          if (c && typeof c === "object") {
            for (const [nodeName, update] of Object.entries(c as Record<string, unknown>)) {
              if (!sawCustomStage) {
                const stage = nodeNameToStage[nodeName];
                if (stage) {
                  appendEvent(jobId, {
                    type: "stage",
                    stage,
                    message: `Reached stage: ${stage}`,
                  });
                }
              }

              if (!update || typeof update !== "object") continue;
              const u = update as Record<string, unknown>;

              if (typeof u.repoPath === "string") state.repoPath = u.repoPath;
              if (typeof u.repoStructure === "string") state.repoStructure = u.repoStructure;
              if (typeof u.installCmd === "string") state.installCmd = u.installCmd;
              if (typeof u.testCmd === "string") state.testCmd = u.testCmd;
              if (typeof u.testScore === "number") state.testScore = u.testScore;
              if (typeof u.errorLog === "string") state.errorLog = u.errorLog;

              if (typeof u.finalStatus === "string") state.finalStatus = u.finalStatus;

              if (typeof u.iterations === "number") state.iterations += u.iterations;

              if (Array.isArray(u.fixes)) {
                state.fixes = state.fixes.concat(u.fixes as FixRecord[]);
              }
            }
          }
        }

        const endTime = Date.now();
        const timeTakenSeconds = Math.floor((endTime - startTime) / 1000);
        const minutes = Math.floor(timeTakenSeconds / 60);
        const seconds = timeTakenSeconds % 60;

        const totalFixes = state.fixes?.length || 0;
        const totalFailures = totalFixes + (state.finalStatus === "FAILED" ? 1 : 0);

        // Detect if the Analyzer determined there were no tests
        const noTestsFound =
          state.testCmd?.toLowerCase().includes("no test") ||
          state.testCmd?.toLowerCase().includes("none") ||
          state.testScore === 0;

        let baseScore = 100;
        const speedBonus = timeTakenSeconds < 300 ? 10 : 0;
        const efficiencyPenalty = totalFixes > 20 ? (totalFixes - 20) * 2 : 0;

        if (state.finalStatus === "FAILED") baseScore -= 50;
        if (noTestsFound) baseScore -= 80;

        const finalScore = Math.max(0, baseScore + speedBonus - efficiencyPenalty);
        const branchName = `${teamName.replace(/\s+/g, "_")}_${leaderName.replace(/\s+/g, "_")}_AI_Fix`;

        const genuineResult = {
          status: noTestsFound ? "NO_TESTS" : (state.finalStatus || "FAILED"),
          summary: {
            repoUrl,
            teamName,
            leaderName,
            branchName,
            totalFailures,
            totalFixes,
            timeTaken: `${minutes}m ${seconds}s`,
          },
          analysis: {
            installCmd: state.installCmd || "N/A",
            testCmd: state.testCmd || "N/A",
            testCoverageScore: state.testScore || 0,
          },
          score: {
            base: baseScore,
            speedBonus,
            efficiencyPenalty,
            final: finalScore,
          },
          fixes: state.fixes || [],
        };

        appendEvent(jobId, { type: "done", payload: genuineResult });
        setJobStatus(jobId, "DONE");
      } catch (error: unknown) {
        console.error("Agent execution failed:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        appendEvent(jobId, { type: "error", message });
        setJobStatus(jobId, "ERROR");
      }
    })();

    return NextResponse.json({ jobId }, { status: 202 });

  } catch (error: unknown) {
    console.error("Agent execution failed:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}