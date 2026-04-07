<<<<<<< HEAD
# auto-doc-updater
=======
# Auto Doc Updater

> LLM-powered documentation sync for GitHub pull requests.
> Built for hackathons. Production-ready architecture.

Paste a GitHub repo URL + PR number → get targeted README section diffs → accept/reject per section → auto-open a GitHub PR with the updated docs.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| LLM | Anthropic Claude (claude-opus-4-5) |
| GitHub API | Octokit |
| Styling | Plain CSS variables (dark theme) |

---

## Project Structure

```
auto-doc-updater/
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── index.js                 Express server
│       ├── routes/
│       │   ├── analysis.js          POST /api/analysis/run
│       │   └── github.js            POST /api/github/create-pr
│       └── services/
│           ├── github.js            Octokit helpers
│           └── llm.js               Anthropic SDK + patch logic
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── styles/global.css
        ├── utils/api.js
        ├── hooks/useAnalysis.js
        └── components/
            ├── InputForm.jsx
            ├── PipelineProgress.jsx
            ├── SectionDiff.jsx
            └── SummaryBar.jsx
```

---

## Setup

### 1. Clone and install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```env
PORT=3001
ANTHROPIC_API_KEY=sk-ant-...        # Required
GITHUB_TOKEN=ghp_...                # Optional — needed for auto-PR creation
FRONTEND_URL=http://localhost:5173
```

**Getting keys:**
- Anthropic API key: https://console.anthropic.com/
- GitHub token: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained
  - Required scopes: `contents: write`, `pull-requests: write`

### 3. Run

```bash
# Terminal 1 — backend
cd backend
npm run dev

# Terminal 2 — frontend
cd frontend
npm run dev
```

Open **http://localhost:5173**

---

## API Endpoints

### `POST /api/analysis/run`
Fetches the PR diff + README, sends to Claude, returns section suggestions.

**Body:**
```json
{
  "repoUrl": "https://github.com/owner/repo",
  "prNumber": "1234"
}
```

**Response:**
```json
{
  "repo": { "owner": "...", "repo": "..." },
  "pr": { "number": 1234, "title": "...", "files": [...], "diffText": "..." },
  "readme": { "content": "...", "sha": "...", "path": "README.md" },
  "analysis": {
    "summary": "...",
    "sections": [
      {
        "id": "s1",
        "heading": "## Installation",
        "oldText": "...",
        "newText": "...",
        "impact": "high",
        "confidence": 92,
        "reason": "...",
        "changeType": "update"
      }
    ]
  }
}
```

### `POST /api/github/create-pr`
Applies accepted changes to the README and opens a GitHub PR.

**Body:**
```json
{
  "repoUrl": "https://github.com/owner/repo",
  "baseBranch": "main",
  "sourcePrNumber": 1234,
  "sourcePrTitle": "feat: ...",
  "readmeContent": "...",
  "readmeSha": "...",
  "readmePath": "README.md",
  "sections": [...],
  "acceptedIds": ["s1", "s3"]
}
```

### `GET /api/github/token-status`
Returns whether the GitHub token is configured.

### `GET /api/health`
Health check — confirms API keys are present.

---

## Deploy

### Backend → Railway / Render

1. Push `backend/` to GitHub
2. Set environment variables in the platform dashboard
3. Set start command: `node src/index.js`

### Frontend → Vercel

1. Push `frontend/` to GitHub
2. Import to Vercel
3. Set env var: `VITE_API_URL=https://your-backend.railway.app`
4. Update `vite.config.js` proxy target or use `VITE_API_URL` in `api.js`

---

## How it works

```
User inputs repo + PR number
        ↓
Backend: GitHub REST API → fetch PR diff + changed files
        ↓
Backend: GitHub REST API → fetch current README
        ↓
Backend: Anthropic Claude → analyze diff vs README
         → identify only affected sections
         → suggest targeted rewrites
        ↓
Frontend: display before/after per section
         → accept / reject each one
        ↓
(Optional) Backend: Octokit
         → create new branch
         → commit patched README
         → open pull request
```

---

## Constraints honored

- Public repos only (no auth needed for reads)
- Real LLM API — no mocks
- Targeted section diff — not a full README rewrite
- API key stays on the backend — never exposed to the browser

---

## License

MIT
>>>>>>> 7638d29 (Initial commit)
