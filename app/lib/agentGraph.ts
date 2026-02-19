import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import { z } from "zod";
import { cloneRepository, runTests, applyFix, commitAndPush } from "./agentTools";
import fs from "fs/promises";
import path from "path";

// 1. Define the Agent's Memory (State)
const AgentState = Annotation.Root({
    repoUrl: Annotation<string>(),
    teamName: Annotation<string>(),
    leaderName: Annotation<string>(),
    repoPath: Annotation<string>(),
    errorLog: Annotation<string>(),
    fixes: Annotation<any[]>({
        reducer: (curr, update) => curr.concat(update),
        default: () => [],
    }),
    iterations: Annotation<number>({
        reducer: (curr, update) => curr + update,
        default: () => 0,
    }),
    finalStatus: Annotation<string>(),
});

// 2. Initialize Groq with Structured Output
const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "meta-llama/llama-4-scout-17b-16e-instruct", // 70B is smart enough for code, and Groq makes it blazing fast
    temperature: 0,
});

// We force Groq to return JSON in this exact format so our Node.js tools can use it
const FixSchema = z.object({
    file: z.string().describe("The relative path of the file to fix (e.g., src/index.js)"),
    newCode: z.string().describe("The complete, fully corrected code for the file"),
    bugType: z.enum(["LINTING", "SYNTAX", "LOGIC", "TYPE_ERROR", "IMPORT", "INDENTATION"]),
    line: z.number().describe("The approximate line number where the bug was found"),
    commitMsg: z.string().describe("A short commit message starting with [AI-AGENT]"),
});

const structuredLlm = llm.withStructuredOutput(FixSchema, { name: "generate_fix" });

// 3. Define the Graph Nodes (The Steps)

async function setupNode(state: typeof AgentState.State) {
    const repoPath = await cloneRepository(state.repoUrl, state.teamName);
    return { repoPath };
}

async function testNode(state: typeof AgentState.State) {
    const testResult = await runTests(state.repoPath);

    if (testResult.passed) {
        return { finalStatus: "PASSED", errorLog: "" };
    } else {
        return { finalStatus: "FAILED", errorLog: testResult.output, iterations: 1 };
    }
}

async function fixNode(state: typeof AgentState.State) {
    console.log(`Analyzing failure (Iteration ${state.iterations})...`);

    // Create the prompt containing the error logs
    const prompt = `
    You are an expert autonomous CI/CD DevOps Agent. 
    The following test suite failed. Read the error logs and determine the exact file that needs fixing.
    Provide the entirely rewritten, corrected code.
    
    ERROR LOGS:
    ${state.errorLog}
  `;

    // Call Groq
    const fixDecision = await structuredLlm.invoke(prompt);

    // Apply the fix using the tools we built in Step 1
    await applyFix(state.repoPath, fixDecision.file, fixDecision.newCode);

    // Format the fix record for the React Dashboard table
    const newFixRecord = {
        id: Date.now(),
        file: fixDecision.file,
        type: fixDecision.bugType,
        line: fixDecision.line,
        commit: fixDecision.commitMsg,
        status: "Fixed"
    };

    return { fixes: [newFixRecord] };
}

// 4. Define the Routing Logic
function shouldContinue(state: typeof AgentState.State) {
    // If tests passed, stop.
    if (state.finalStatus === "PASSED") return "commitNode";

    // If we've tried 3 times and it's still failing, stop to prevent infinite loops (Hackathon survival tactic!)
    if (state.iterations >= 3) return "commitNode";

    // Otherwise, loop back to the fix node
    return "fixNode";
}

async function commitNode(state: typeof AgentState.State) {
    const branchName = `${state.teamName.replace(/\s+/g, "_")}_${state.leaderName.replace(/\s+/g, "_")}_AI_Fix`;
    await commitAndPush(state.repoPath, branchName);
    return { finalStatus: state.finalStatus }; // Keep the final status (PASSED or FAILED)
}

// 5. Compile the Graph
const workflow = new StateGraph(AgentState)
    .addNode("setup", setupNode)
    .addNode("test", testNode)
    .addNode("fix", fixNode)
    .addNode("commitNode", commitNode)

    .addEdge(START, "setup")
    .addEdge("setup", "test")

    // Conditional routing after testing
    .addConditionalEdges("test", shouldContinue, {
        commitNode: "commitNode",
        fixNode: "fix",
    })

    // After applying a fix, always run tests again to verify
    .addEdge("fix", "test")
    .addEdge("commitNode", END);

export const agentRunner = workflow.compile();