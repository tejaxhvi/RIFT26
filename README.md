# 🤖 Omniscient Agent — Autonomous CI/CD Bug Fixer

> An AI-powered autonomous agent that clones a GitHub repository, analyzes its structure, runs its test suite, diagnoses failures with an LLM, applies fixes, and pushes a clean branch — all without human intervention.

## 🌐 Deployment

| | URL |
|---|---|
| **Live App** | _`<YOUR_DEPLOYMENT_URL>`_ |
| **LinkedIn Demo** | _`<YOUR_LINKEDIN_VIDEO_URL>`_ |

---

## 🏗️ Architecture

```mermaid
graph TD
    A["👤 User (React Dashboard)"] -->|"repoUrl, teamName, leaderName"| B["POST /api/run"]
    B --> C["LangGraph Agent Pipeline"]

    subgraph C["LangGraph Agent Pipeline"]
        direction TB
        D["1. Setup Node\n(git clone → ./tmp/)"] --> E["2. Analyzer Node\n(LLM scans repo structure)"]
        E --> F["3. Test Node\n(dynamic install + test cmd)"]
        F -->|PASSED| H["5. Commit Node\n(git push branch)"]
        F -->|FAILED| G["4. Fix Node\n(LLM rewrites file)"]
        G -->|"re-test (max 3x)"| F
    end

    H --> I["Branch: TEAM_LEADER_AI_Fix"]
    I --> J["POST /api/createpr"]
    J --> K["Opens PR on GitHub"]

    A -->|"Click 'Create PR'"| J

    style C fill:#1a1a2e,stroke:#e94560,color:#fff
    style D fill:#0f3460,stroke:#e94560,color:#fff
    style E fill:#0f3460,stroke:#e94560,color:#fff
    style F fill:#0f3460,stroke:#e94560,color:#fff
    style G fill:#0f3460,stroke:#e94560,color:#fff
    style H fill:#0f3460,stroke:#e94560,color:#fff
```

**Pipeline Flow:**

1. **Setup** — Clones the target repo into `./tmp/TEAM_NAME_<timestamp>/`
2. **Analyze** — LLM inspects the file tree to determine language, install command, test command, and test quality score
3. **Test** — Dynamically runs the detected test command
4. **Fix** — If tests fail, the LLM reads error logs + file structure and rewrites the broken file
5. **Re-test** — Loops back to Test (up to 3 iterations)
6. **Commit** — Creates a `TEAM_NAME_LEADER_NAME_AI_Fix` branch & pushes via git

---

## ⚡ Installation

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A **GitHub Personal Access Token** with `repo` scope
- A **Groq API Key** (for LLM inference)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/<your-org>/RIFT26.git
cd RIFT26

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
```

---

## 🔐 Environment Setup

Create a `.env` file in the project root with the following variables:

```env
# GitHub Personal Access Token (needs 'repo' scope for push + PR creation)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Groq API Key (for Llama 4 Scout inference)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🚀 Usage

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Using the Dashboard

1. **Enter** the GitHub repository URL (e.g., `https://github.com/user/repo`)
2. **Enter** your Team Name (e.g., `Code Warriors`)
3. **Enter** Team Leader name (e.g., `John Doe`)
4. **Click "Run Agent"** — the agent will:
   - Clone the repo locally
   - Analyze the project structure with AI
   - Run the test suite
   - Fix any failing tests using Llama 4 Scout
   - Push fixes to a branch named `CODE_WARRIORS_JOHN_DOE_AI_Fix`
5. **Click "Create PR"** — opens a Pull Request on the target GitHub repo

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/run` | Runs the full agent pipeline (clone → analyze → test → fix → push) |
| `POST` | `/api/createpr` | Creates a GitHub PR from the pushed branch |

---

## 🐛 Supported Bug Types

The AI agent can detect and fix the following categories of bugs:

| Bug Type | Description |
|----------|-------------|
| `LINTING` | Code style and linting violations |
| `SYNTAX` | Syntax errors (missing brackets, quotes, semicolons) |
| `LOGIC` | Logical errors in program flow |
| `TYPE_ERROR` | Type mismatches and type-related issues |
| `IMPORT` | Missing or incorrect import/require statements |
| `INDENTATION` | Indentation and whitespace issues |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, Lucide Icons |
| **Backend** | Next.js App Router (API Routes) |
| **AI / LLM** | LangGraph, LangChain, Groq (Llama 4 Scout 17B) |
| **Schema Validation** | Zod 4 |
| **Git Operations** | simple-git |
| **GitHub API** | Octokit (via git push with token auth) |
| **Language** | TypeScript 5 |

---

## ⚠️ Known Limitations

- **Max 3 fix iterations** — The agent will attempt up to 3 fix cycles before committing whatever state it has reached, to prevent infinite loops.
- **Single file fixes** — Each fix iteration rewrites one file at a time. Multi-file bugs may require multiple iterations.
- **Text files only** — The agent handles text-based source files; binary files are not modified.
- **Public/token-accessible repos** — The GitHub token must have access to the target repository for cloning and pushing.
- **LLM context limits** — Very large repositories may exceed the LLM context window during analysis.
- **No test generation** — If a repo has no test suite, the agent cannot create one; it reports `NO_TESTS` status and applies a score penalty.

---

## 👥 Team Members

| Name | Role |
|------|------|
| _Team Member 1_ | _Role_ |
| _Team Member 2_ | _Role_ |
| _Team Member 3_ | _Role_ |

---

<p align="center">
  Built with ❤️ for <strong>RIFT 2026</strong>
</p>
