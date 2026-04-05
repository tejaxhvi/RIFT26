"use client"

import { AlertTriangle } from "lucide-react"; // 🆕 Added AlertTriangle
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FixesTable } from "@/app/components/dashboard/FixesTable";
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

export default function Results({ agentData }: { agentData: AgentData | null }) {
  return (
      <main className="container mx-auto p-6 space-y-6">
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
  </main>

  )
}
