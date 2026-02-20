import { exec } from "child_process";
import { promisify } from "util";
import simpleGit, { SimpleGit } from "simple-git";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

// 1. Clones to your local ./tmp folder
export async function cloneRepository(repoUrl: string, teamName: string): Promise<string> {
  const timestamp = Date.now();
  const clonePath = path.join(process.cwd(), "tmp", `${teamName.replace(/\s+/g, "_")}_${timestamp}`);
  await fs.mkdir(clonePath, { recursive: true });

  const git: SimpleGit = simpleGit();
  console.log(`Cloning ${repoUrl} locally into ${clonePath}...`);
  await git.clone(repoUrl, clonePath);

  return clonePath;
}

// 2. 🆕 Cross-platform File Scanner for the Analyzer LLM
export async function getRepoStructure(dir: string, depth = 0, maxDepth = 4): Promise<string> {
  if (depth > maxDepth) return "";
  let structure = "";

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      // Ignore heavy dependencies so we don't blow up the LLM context window
      if ([".git", "node_modules", "venv", "__pycache__", ".next"].includes(entry.name)) continue;

      const prefix = "  ".repeat(depth) + "|-- ";
      structure += prefix + entry.name + "\n";

      if (entry.isDirectory()) {
        structure += await getRepoStructure(path.join(dir, entry.name), depth + 1, maxDepth);
      }
    }
  } catch (err) {
    console.error("Error reading directory structure:", err);
  }

  return structure;
}

// 3. 🔄 Dynamic Executor (Runs whatever the Analyzer tells it to)
export async function runTests(repoPath: string, installCmd: string, testCmd: string): Promise<{ passed: boolean; output: string }> {
  try {
    if (installCmd && installCmd.toLowerCase() !== "none") {
      console.log(`Installing dependencies: ${installCmd}`);
      await execAsync(installCmd, { cwd: repoPath });
    }

    console.log(`Running tests: ${testCmd}`);
    const { stdout, stderr } = await execAsync(testCmd, {
      cwd: repoPath,
      env: { ...process.env, CI: "true" }
    });

    return { passed: true, output: stdout };
  } catch (error: any) {
    return {
      passed: false,
      output: (error.stdout || "") + "\n" + (error.stderr || "")
    };
  }
}

// 4. Applies the fix to the exact local file
export async function applyFix(repoPath: string, filePath: string, newCode: string): Promise<void> {
  // Normalizes the path in case the LLM tries to add a leading slash or uses wrong slashes
  const normalizedFilePath = filePath.replace(/\\/g, '/').replace(/^\/?repo\//, '').replace(/^\.\//, '');
  const fullPath = path.join(repoPath, normalizedFilePath);

  await fs.writeFile(fullPath, newCode, "utf-8");
  console.log(`Overwrote ${normalizedFilePath} with LLM fix.`);
}

// 5. Commits and pushes to GitHub from the cloned tmp folder
export async function commitAndPush(repoUrl: string, repoPath: string, branchName: string): Promise<void> {
  const git: SimpleGit = simpleGit(repoPath);
  console.log(`Committing fixes in ${repoPath} to branch: ${branchName}`);

  await git.checkoutLocalBranch(branchName);
  await git.add("./*");
  await git.commit("[AI-AGENT] Omniscient Applied automated fixes");

  // The clone already has an "origin" remote — update it with the authenticated URL for push
  const token = process.env.GITHUB_TOKEN;
  const authedUrl = repoUrl.replace("https://", `https://${token}@`);
  await git.remote(["set-url", "origin", authedUrl]);

  await git.push("origin", branchName);
  console.log(`✅ Pushed branch "${branchName}" to GitHub.`);
}