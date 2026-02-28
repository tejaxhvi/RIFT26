"use client";

import { useState } from "react";
import { Play, Activity, AlertTriangle } from "lucide-react"; // 🆕 Added AlertTriangle
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FixesTable } from "@/app/components/dashboard/FixesTable";

// 🆕 Updated Type to match the new backend response
type AgentData = {
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
  fixes: Array<any>;
};


export default function Dashboard() {
  const [repoUrl, setRepoUrl] = useState("");
  const [teamName, setTeamName] = useState("");
  const [leaderName, setLeaderName] = useState("");
  
  const [isRunning, setIsRunning] = useState(false);
  const [agentData, setAgentData] = useState<AgentData | null>(null);

  const handleRunAgent = async () => {
    setIsRunning(true);
    setAgentData(null); 
    
    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, teamName, leaderName }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to run agent");

      setAgentData(data);
    } catch (error) {
      console.error("Agent run failed:", error);
      alert("Error running the agent.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <main className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-8 w-8 text-primary" />
          Omniscient Agent
        </h1>
        {/* 🆕 Dynamic Badge Coloring based on NO_TESTS status */}
        <Badge 
          variant={agentData?.status === "PASSED" ? "default" : agentData?.status === "NO_TESTS" ? "secondary" : "destructive"} 
          className={agentData?.status === "NO_TESTS" ? "bg-yellow-500 text-black hover:bg-yellow-400" : "text-sm"}
        >
          Status: {isRunning ? "Running..." : agentData?.status || "Idle"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column: Controller */}
        <div className="md:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agent Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">GitHub URL</label>
                <Input placeholder="https://github.com/user/repo" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Team Name</label>
                <Input placeholder="e.g., RIFT ORGANISERS" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Team Leader</label>
                <Input placeholder="e.g., Saiyam Kumar" value={leaderName} onChange={(e) => setLeaderName(e.target.value)} />
              </div>
              <Button className="w-full" size="lg" onClick={handleRunAgent} disabled={isRunning}>
                <Play className="mr-2 h-4 w-4" />
                {isRunning ? "Agent Running..." : "Run Agent"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Metrics & Results */}
        <div className="md:col-span-8 space-y-6">
          
          {/* 🆕 Changed to 3 Columns to fit the Analyzer Report */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Run Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agentData ? `${agentData.summary.totalFixes} Fixes` : "Waiting"}</div>
                <p className="text-xs text-muted-foreground mt-1">Branch: {agentData ? agentData.summary.branchName : "N/A"}</p>
                {agentData && <p className="text-xs text-muted-foreground mt-1">Time Taken: {agentData.summary.timeTaken}</p>}
              </CardContent>
            </Card>

            {/* 🆕 New Analyzer Report Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Analyzer Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Test Quality:</span>
                  <span className="font-bold">{agentData ? `${agentData.analysis.testCoverageScore}/100` : "N/A"}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Install:</span>
                  <span className="font-mono truncate max-w-[120px]" title={agentData?.analysis.installCmd}>{agentData ? agentData.analysis.installCmd : "N/A"}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Test:</span>
                  <span className="font-mono truncate max-w-[120px]" title={agentData?.analysis.testCmd}>{agentData ? agentData.analysis.testCmd : "N/A"}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Agent Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agentData ? `${agentData.score.final} / 100` : "0 / 100"}</div>
                <Progress value={agentData ? agentData.score.final : 0} className="mt-3" />
              </CardContent>
            </Card>

          </div>

          {/* 🆕 Giant Warning Banner if No Tests Found */}
          {agentData?.status === "NO_TESTS" && (
            <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-600 p-4 rounded-md flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-lg">No Test Suite Detected</h4>
                <p className="text-sm mt-1">The Analyzer Agent could not find a standard testing framework (e.g., pytest, jest, mocha) in this repository. The agent requires tests to verify its autonomous fixes.</p>
              </div>
            </div>
          )}

          <Card className="min-h-[400px]">
            <CardHeader>
              <CardTitle>Fixes Applied</CardTitle>
            </CardHeader>
            <CardContent>
              <FixesTable fixes={agentData?.fixes || []} />
            </CardContent>
          </Card>
        </div>

      </div>
    </main>
  );
}