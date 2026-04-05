"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Results, { type AgentData } from "@/app/components/Results";

type StageData = { stage: string; message?: string; iteration?: number };


export default function DashboardUI() {
  const [repoUrl, setRepoUrl] = useState("");
  const [teamName, setTeamName] = useState("");
  const [leaderName, setLeaderName] = useState("");
  
  const [isRunning, setIsRunning] = useState(false);
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [stage, setStage] = useState<StageData | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  const handleRunAgent = async () => {
    setIsRunning(true);
    setAgentData(null);
    setStage(null);
    setLogs([]);
    setError(null);
    
    try {
      // Start the run; the agent continues in the background.
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, teamName, leaderName }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to start agent");

      const { jobId } = data as { jobId: string };
      if (!jobId) throw new Error("Missing jobId from /api/run response");

      if (sourceRef.current) {
        try {
          sourceRef.current.close();
        } catch {
          // ignore
        }
      }

      const es = new EventSource(`/api/run/events?jobId=${jobId}`);
      sourceRef.current = es;

      es.addEventListener("stage", (event) => {
        const payload = JSON.parse(event.data) as StageData;
        setStage(payload);
      });

      es.addEventListener("log", (event) => {
        const payload = JSON.parse(event.data) as { stream: string; line: string };
        setLogs((prev) => {
          const next = [...prev, `${payload.stream}: ${payload.line}`];
          // Prevent unbounded memory growth.
          return next.slice(-800);
        });
      });

      es.addEventListener("done", (event) => {
        const payload = JSON.parse(event.data) as AgentData;
        setAgentData(payload);
        setStage({ stage: "done" });
        setIsRunning(false);
        es.close();
      });

      es.addEventListener("error", () => {
        setError("Agent run failed (SSE connection error).");
        setIsRunning(false);
        es.close();
      });
    } catch (error) {
      console.error("Agent run failed:", error);
      setError(error instanceof Error ? error.message : "Error running the agent.");
      setIsRunning(false);
    }
  };

  useEffect(() => {
    return () => {
      if (sourceRef.current) {
        try {
          sourceRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return (
    <main className="container mx-auto p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agent Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">GitHub URL</label>
                <Input
                  placeholder="https://github.com/user/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  disabled={isRunning}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Team Name</label>
                <Input
                  placeholder="e.g., RIFT ORGANISERS"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  disabled={isRunning}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Team Leader</label>
                <Input
                  placeholder="e.g., Saiyam Kumar"
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                  disabled={isRunning}
                />
              </div>
              <Button className="w-full" size="lg" onClick={handleRunAgent} disabled={isRunning}>
                <Play className="mr-2 h-4 w-4" />
                {isRunning ? "Agent Running..." : "Run Agent"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Live Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <div className="font-medium">Stage</div>
                <div className="font-mono text-xs text-muted-foreground">
                  {stage ? `${stage.stage}${stage.iteration !== undefined ? ` (iter ${stage.iteration})` : ""}` : "Waiting"}
                </div>
                {stage?.message && <div className="text-xs text-muted-foreground mt-1">{stage.message}</div>}
              </div>

              {error && <div className="text-sm text-red-500">{error}</div>}

              <div className="border rounded-md p-2 bg-black/10">
                <pre className="text-[11px] font-mono max-h-64 overflow-auto whitespace-pre-wrap">
                  {logs.length ? logs.join("\n") : "No logs yet..."}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Results */}
          <Results agentData={agentData} />
        </div>
      </div>
    </main>
  );
}