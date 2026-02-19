import { NextResponse } from "next/server";
import { agentRunner } from "@/app/lib/agentGraph"; // Adjust path if necessary

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { repoUrl, teamName, leaderName } = body;

    // Basic validation
    if (!repoUrl || !teamName || !leaderName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Start the timer for the Hackathon Speed Bonus
    const startTime = Date.now();
    console.log(`Starting autonomous agent workflow for ${repoUrl}...`);

    // 2. Invoke the actual LangGraph Agent!
    const finalState = await agentRunner.invoke({
      repoUrl,
      teamName,
      leaderName,
    });

    // 3. Stop the timer and format the duration
    const endTime = Date.now();
    const timeTakenSeconds = Math.floor((endTime - startTime) / 1000);
    const minutes = Math.floor(timeTakenSeconds / 60);
    const seconds = timeTakenSeconds % 60;

    // 4. Calculate Hackathon Gamification Metrics
    const totalFixes = finalState.fixes?.length || 0;
    
    // We assume total failures was at least the number of fixes it had to make.
    // If it still failed at the end, we add 1 to show there's an unresolved issue.
    const totalFailures = totalFixes + (finalState.finalStatus === "FAILED" ? 1 : 0); 
    
    let baseScore = 100;
    // Speed bonus: +10 if under 5 minutes (300 seconds)
    let speedBonus = timeTakenSeconds < 300 ? 10 : 0; 
    // Efficiency penalty: -2 for every commit/fix over 20
    let efficiencyPenalty = totalFixes > 20 ? (totalFixes - 20) * 2 : 0;
    
    // Major penalty if the agent couldn't solve it after max retries
    if (finalState.finalStatus === "FAILED") {
      baseScore -= 50; 
    }

    const finalScore = baseScore + speedBonus - efficiencyPenalty;
    const branchName = `${teamName.replace(/\s+/g, "_")}_${leaderName.replace(/\s+/g, "_")}_AI_Fix`;

    // 5. Construct the genuine payload for the React Dashboard
    const genuineResult = {
      status: finalState.finalStatus || "FAILED",
      summary: {
        repoUrl,
        teamName,
        leaderName,
        branchName,
        totalFailures,
        totalFixes,
        timeTaken: `${minutes}m ${seconds}s`,
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
    console.error("Agent execution critically failed:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error in Agent Workflow" },
      { status: 500 }
    );
  }
}