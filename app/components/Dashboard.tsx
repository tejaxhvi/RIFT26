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


export default function DashboardUI() {
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
      <div className="flex w-full">
        
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

      </div>
    </main>
  );
}