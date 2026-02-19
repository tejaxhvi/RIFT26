import { exec } from "child_process";
import { promisify } from "util";
import simpleGit, { SimpleGit } from "simple-git";
import fs from "fs/promises";
import path from "path";

// Promisify exec so we can use async/await instead of callbacks
const execAsync = promisify(exec);

/**
 * 1. Clones the repository into a temporary directory
 */
export async function cloneRepository(repoUrl: string, teamName: string): Promise<string> {
  const timestamp = Date.now();
  // Create a unique folder in the system's temp directory
  const clonePath = path.join(process.cwd(), "tmp", `${teamName.replace(/\s+/g, "_")}_${timestamp}`);
  
  // Ensure the tmp directory exists
  await fs.mkdir(clonePath, { recursive: true });

  const git: SimpleGit = simpleGit();
  console.log(`Cloning ${repoUrl} into ${clonePath}...`);
  await git.clone(repoUrl, clonePath);
  
  return clonePath;
}

/**
 * 2. Runs the test suite and captures the output
 */
export async function runTests(repoPath: string): Promise<{ passed: boolean; output: string }> {
  try {
    console.log("Installing dependencies...");
    await execAsync("npm install", { cwd: repoPath });

    console.log("Running tests...");
    // Force tests to run in CI mode so they don't hang waiting for user input
    const { stdout, stderr } = await execAsync("npm test", { 
      cwd: repoPath,
      env: { ...process.env, CI: "true" } 
    });
    
    return { passed: true, output: stdout };
  } catch (error: any) {
    // child_process throws an error if the exit code is not 0 (which happens when tests fail)
    return { 
      passed: false, 
      output: error.stdout + "\n" + error.stderr 
    };
  }
}

/**
 * 3. Applies the code fix written by the LLM
 */
export async function applyFix(repoPath: string, filePath: string, newCode: string): Promise<void> {
  const fullPath = path.join(repoPath, filePath);
  await fs.writeFile(fullPath, newCode, "utf-8");
  console.log(`Overwrote ${filePath} with LLM fix.`);
}

/**
 * 4. Commits the changes and pushes to a new branch
 */
export async function commitAndPush(repoPath: string, branchName: string): Promise<void> {
  const git: SimpleGit = simpleGit(repoPath);
  
  await git.checkoutLocalBranch(branchName);
  await git.add("./*");
  await git.commit("[AI-AGENT] Applied automated fixes");
  
  // Note: Pushing requires authenticated URL in a real scenario. 
  // For a hackathon demo, you can leave the push out if you just want to show the local diff,
  // or ensure the repoUrl has a GitHub Personal Access Token injected.
  console.log(`Committed fixes to branch: ${branchName}`);
}