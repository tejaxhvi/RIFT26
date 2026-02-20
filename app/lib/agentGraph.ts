import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import { z } from "zod";
import { cloneRepository, getRepoStructure, runTests, applyFix, commitAndPush } from "./agentTools";
import { FixRecord } from "@/app/components/dashboard/FixesTable";

// 1. Expanded State Memory
const AgentState = Annotation.Root({
    repoUrl: Annotation<string>(),
    teamName: Annotation<string>(),
    leaderName: Annotation<string>(),
    repoPath: Annotation<string>(),
    repoStructure: Annotation<string>(), // Added to memory
    installCmd: Annotation<string>(),    // Added to memory
    testCmd: Annotation<string>(),       // Added to memory
    testScore: Annotation<number>(),     // Added to memory
    errorLog: Annotation<string>(),
    fixes: Annotation<FixRecord[]>({ reducer: (curr, update) => curr.concat(update), default: () => [] }),
    iterations: Annotation<number>({ reducer: (curr, update) => curr + update, default: () => 0 }),
    finalStatus: Annotation<string>(),
});

const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    temperature: 0,
});

// 2. The Analyzer Schema
const AnalyzeSchema = z.object({
    language: z.string().describe("Primary programming language (e.g., Python, Node, Go)"),
    installCmd: z.string().describe("Command to install dependencies. Use 'none' if none needed."),
    testCmd: z.string().describe("Command to run tests (e.g., 'pytest', 'npm test'). Use 'echo No tests found' if none exist."),
    testScore: z.number().describe("Score 0-100 evaluating test coverage based on file presence.")
});
const analyzeLlm = llm.withStructuredOutput(AnalyzeSchema, { name: "analyze_repo" });

// 3. The Fixer Schema
const FixSchema = z.object({
    file: z.string().describe("The exact relative file path from the repository root"),
    newCode: z.string(),
    bugType: z.enum(["LINTING", "SYNTAX", "LOGIC", "TYPE_ERROR", "IMPORT", "INDENTATION"]),
    line: z.number(),
    commitMsg: z.string(),
});
const structuredLlm = llm.withStructuredOutput(FixSchema, { name: "generate_fix" });

// 4. Graph Nodes
async function setupNode(state: typeof AgentState.State) {
    const repoPath = await cloneRepository(state.repoUrl, state.teamName);
    return { repoPath };
}

// 🆕 The New Analyzer Agent
async function analyzeNode(state: typeof AgentState.State) {
    console.log("Analyzing repository structure...");
    const structure = await getRepoStructure(state.repoPath);

    const prompt = `You are an expert DevOps Architect. Look at the following file structure for a cloned repository:
  \n${structure}\n
  Determine the primary language, the exact terminal command to install dependencies, and the exact command to run the test suite. 
  Evaluate the test quality (score 0-100).
  
  CRITICAL INSTRUCTION: You MUST respond by calling the provided structured output tool. DO NOT output any conversational text, explanations, or preamble. Just output the structured data.`;

    const analysis = await analyzeLlm.invoke(prompt);
    console.log(`[Analyzer] Language: ${analysis.language} | Test Cmd: ${analysis.testCmd}`);

    return {
        repoStructure: structure,
        installCmd: analysis.installCmd,
        testCmd: analysis.testCmd,
        testScore: analysis.testScore
    };
}

async function testNode(state: typeof AgentState.State) {
    const testResult = await runTests(state.repoPath, state.installCmd, state.testCmd);

    if (testResult.passed) {
        return { finalStatus: "PASSED", errorLog: "" };
    } else {
        return { finalStatus: "FAILED", errorLog: testResult.output, iterations: 1 };
    }
}

async function fixNode(state: typeof AgentState.State) {
    console.log(`Analyzing failure (Iteration ${state.iterations})...`);

    const prompt = `
    You are an expert autonomous CI/CD DevOps Agent. 
    The test suite failed. Here is the exact directory structure of the repository:
    \n${state.repoStructure}\n
    
    Here are the ERROR LOGS:
    \n${state.errorLog}\n
    
    Determine the EXACT file from the directory structure that caused the error. Rewrite the completely corrected code for that specific file.
    
    CRITICAL INSTRUCTION: You MUST respond strictly by calling the provided structured output tool. DO NOT output any thinking process, conversational text, markdown formatting, or preamble like "To solve this task...". Just output the tool call.
  `;

    const fixDecision = await structuredLlm.invoke(prompt);
    await applyFix(state.repoPath, fixDecision.file, fixDecision.newCode);

    return {
        fixes: [{ id: Date.now(), file: fixDecision.file, type: fixDecision.bugType, line: fixDecision.line, commit: fixDecision.commitMsg, status: "Fixed" }]
    };
}

function shouldContinue(state: typeof AgentState.State) {
    if (state.finalStatus === "PASSED") return "commitNode";
    if (state.iterations >= 3) return "commitNode";
    return "fixNode";
}

async function commitNode(state: typeof AgentState.State) {
    const branchName = `${state.teamName.replace(/\s+/g, "_").toUpperCase()}_${state.leaderName.replace(/\s+/g, "_").toUpperCase()}_AI_Fix`;
    await commitAndPush(state.repoUrl, state.repoPath, branchName);
    return { finalStatus: state.finalStatus };
}

// 5. Compile the Workflow
const workflow = new StateGraph(AgentState)
    .addNode("setup", setupNode)
    .addNode("analyze", analyzeNode)
    .addNode("test", testNode)
    .addNode("fix", fixNode)
    .addNode("commitNode", commitNode)

    .addEdge(START, "setup")
    .addEdge("setup", "analyze")
    .addEdge("analyze", "test")
    .addConditionalEdges("test", shouldContinue, { commitNode: "commitNode", fixNode: "fix" })
    .addEdge("fix", "test")
    .addEdge("commitNode", END);

export const agentRunner = workflow.compile();