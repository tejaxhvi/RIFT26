import { spawn } from "child_process";
import simpleGit, { SimpleGit } from "simple-git";
import fs from "fs/promises";
import path from "path";

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
type LogEntry = { stream: "stdout" | "stderr"; line: string };

function splitAndEmit(
  text: string,
  carry: { buf: string },
  emit: (entry: LogEntry) => void,
  stream: LogEntry["stream"]
) {
  carry.buf += text;
  const parts = carry.buf.split(/\r?\n/);
  carry.buf = parts.pop() || "";

  for (const line of parts) {
    // Ignore completely empty "lines" so logs don't explode on frequent newlines.
    if (line.length === 0) continue;
    emit({ stream, line });
  }
}

async function runCommandStreaming(opts: {
  command: string;
  cwd: string;
  env?: NodeJS.ProcessEnv;
  onLog?: (entry: LogEntry) => void;
}): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const { command, cwd, env, onLog } = opts;

  const child = spawn(command, { cwd, env: env ?? process.env, shell: true });

  const stdoutCarry = { buf: "" };
  const stderrCarry = { buf: "" };
  let stdout = "";
  let stderr = "";

  await new Promise<void>((resolve, reject) => {
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      if (onLog) splitAndEmit(text, stdoutCarry, onLog, "stdout");
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      if (onLog) splitAndEmit(text, stderrCarry, onLog, "stderr");
    });

    child.on("error", (err) => reject(err));

    child.on("close", () => {
      // Emit remaining partial lines (if any).
      if (onLog) {
        if (stdoutCarry.buf.length > 0) onLog({ stream: "stdout", line: stdoutCarry.buf });
        if (stderrCarry.buf.length > 0) onLog({ stream: "stderr", line: stderrCarry.buf });
      }
      resolve();
    });
  });

  return { exitCode: child.exitCode ?? 0, stdout, stderr };
}

export async function runTests(
  repoPath: string,
  installCmd: string,
  testCmd: string,
  onLog?: (entry: LogEntry) => void
): Promise<{ passed: boolean; output: string }> {
  const env = { ...process.env, CI: "true" };

  const installResult = async () => {
    if (installCmd && installCmd.toLowerCase() !== "none") {
      console.log(`Installing dependencies: ${installCmd}`);
      const result = await runCommandStreaming({ command: installCmd, cwd: repoPath, env, onLog });
      return result;
    }
    return { exitCode: 0, stdout: "", stderr: "" };
  };

  try {
    await installResult();

    console.log(`Running tests: ${testCmd}`);
    const testResult = await runCommandStreaming({ command: testCmd, cwd: repoPath, env, onLog });

    if (testResult.exitCode === 0) {
      return { passed: true, output: testResult.stdout };
    }

    return {
      passed: false,
      output: testResult.stdout + "\n" + testResult.stderr,
    };
  } catch (error: unknown) {
    const err = error as { stdout?: unknown; stderr?: unknown } | undefined;
    return {
      passed: false,
      output: (err?.stdout ? String(err.stdout) : "") + "\n" + (err?.stderr ? String(err.stderr) : ""),
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