import { NextResponse } from "next/server";
import { agentRunner } from "@/app/lib/agentGraph";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { repoUrl, teamName, leaderName } = body;

    if (!repoUrl || !teamName || !leaderName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const startTime = Date.now();
    console.log(`Starting autonomous agent workflow for ${repoUrl}...`);

    const finalState = await agentRunner.invoke({
      repoUrl,
      teamName,
      leaderName,
    });

    const endTime = Date.now();
    const timeTakenSeconds = Math.floor((endTime - startTime) / 1000);
    const minutes = Math.floor(timeTakenSeconds / 60);
    const seconds = timeTakenSeconds % 60;

    const totalFixes = finalState.fixes?.length || 0;
    const totalFailures = totalFixes + (finalState.finalStatus === "FAILED" ? 1 : 0); 
    
    // 🆕 Detect if the Analyzer determined there were no tests
    const noTestsFound = finalState.testCmd?.toLowerCase().includes("no test") || 
                         finalState.testCmd?.toLowerCase().includes("none") ||
                         finalState.testScore === 0;

    let baseScore = 100;
    let speedBonus = timeTakenSeconds < 300 ? 10 : 0; 
    let efficiencyPenalty = totalFixes > 20 ? (totalFixes - 20) * 2 : 0;
    
    if (finalState.finalStatus === "FAILED") baseScore -= 50; 
    if (noTestsFound) baseScore -= 80; // Huge penalty for pushing code without tests!

    const finalScore = Math.max(0, baseScore + speedBonus - efficiencyPenalty);
    const branchName = `${teamName.replace(/\s+/g, "_")}_${leaderName.replace(/\s+/g, "_")}_AI_Fix`;

    const genuineResult = {
      // 🆕 Custom status for the frontend badge
      status: noTestsFound ? "NO_TESTS" : (finalState.finalStatus || "FAILED"),
      summary: {
        repoUrl,
        teamName,
        leaderName,
        branchName,
        totalFailures,
        totalFixes,
        timeTaken: `${minutes}m ${seconds}s`,
      },
      // 🆕 Package the Analyzer's report for the React UI
      analysis: {
        installCmd: finalState.installCmd || "N/A",
        testCmd: finalState.testCmd || "N/A",
        testCoverageScore: finalState.testScore || 0,
      },
      score: {
        base: baseScore,
        speedBonus,
        efficiencyPenalty,
        final: finalScore,
      },
      fixes: finalState.fixes || [],
    };

    return NextResponse.json(genuineResult, { status: 200 });

  } catch (error: any) {
    console.error("Agent execution failed:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}