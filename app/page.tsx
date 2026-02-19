"use client";

import { useState } from "react";
import { Play, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FixesTable } from "@/app/components/dashboard/FixesTable";

// We define the shape of our mock backend response here
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
  score: {
    base: number;
    speedBonus: number;
    efficiencyPenalty: number;
    final: number;
  };
  fixes: Array<{
    id: number;
    file: string;
    type: string;
    line: number;
    commit: string;
    status: string;
  }>;
};

export default function Dashboard() {
  const [repoUrl, setRepoUrl] = useState("");
  const [teamName, setTeamName] = useState("");
  const [leaderName, setLeaderName] = useState("");
  
  const [isRunning, setIsRunning] = useState(false);
  const [agentData, setAgentData] = useState<AgentData | null>(null);

  const handleRunAgent = async () => {
    setIsRunning(true);
    setAgentData(null); // Clear previous results when running again
    
    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, teamName, leaderName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to run agent");
      }

      // Save the backend JSON into our React state!
      setAgentData(data);
      
    } catch (error) {
      console.error("Agent run failed:", error);
      alert("Error: Please make sure all fields are filled.");
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
        <Badge variant={agentData?.status === "PASSED" ? "default" : "outline"} className="text-sm">
          Status: {isRunning ? "Running..." : agentData?.status || "Idle"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column: Input Controller */}
        <div className="md:col-span-4 space-y-6">
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
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Team Name</label>
                <Input 
                  placeholder="e.g., RIFT ORGANISERS" 
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Team Leader</label>
                <Input 
                  placeholder="e.g., Saiyam Kumar" 
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                />
              </div>
              <Button 
                className="w-full" 
                size="lg" 
                onClick={handleRunAgent}
                disabled={isRunning}
              >
                <Play className="mr-2 h-4 w-4" />
                {isRunning ? "Agent Running..." : "Run Agent"}
              </Button>
            </CardContent>
          </Card>

          <Card className="min-h-[300px]">
             <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">CI/CD Timeline</CardTitle>
             </CardHeader>
             <CardContent className="flex items-center justify-center text-muted-foreground text-sm h-full">
                Timeline will appear here after execution...
             </CardContent>
          </Card>
        </div>

        {/* Right Column: Dynamic Metrics & Results */}
        <div className="md:col-span-8 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dynamic Run Summary Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Run Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {agentData ? `${agentData.summary.totalFixes} Fixes Applied` : "Waiting for input"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Branch: {agentData ? agentData.summary.branchName : "N/A"}
                </p>
                {agentData && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Time Taken: {agentData.summary.timeTaken}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Dynamic Score Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Agent Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {agentData ? `${agentData.score.final} / 100` : "0 / 100"}
                </div>
                <Progress value={agentData ? agentData.score.final : 0} className="mt-3" />
              </CardContent>
            </Card>
          </div>

          <Card className="min-h-[400px]">
            <CardHeader>
              <CardTitle>Fixes Applied</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center text-muted-foreground">
              <Card className="min-h-[400px]">
         <CardHeader>
           <CardTitle>Fixes Applied</CardTitle>
         </CardHeader>
         <CardContent>
           {/* Pass the fixes array from our state to the table! */}
           <FixesTable fixes={agentData?.fixes || []} />
         </CardContent>
       </Card>
            </CardContent>
          </Card>
        </div>

      </div>
    </main>
  );
}