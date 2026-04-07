import { Octokit } from 'octokit';

function getOctokit() {
  return new Octokit({
    auth: process.env.GITHUB_TOKEN || undefined
  });
}

/**
 * Parse a GitHub URL into { owner, repo }
 */
export function parseGitHubUrl(url) {
  const match = url.trim()
    .replace(/\.git$/, '')
    .match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error('Invalid GitHub URL. Expected: https://github.com/owner/repo');
  return { owner: match[1], repo: match[2] };
}

/**
 * Fetch PR metadata + changed files with diffs
 */
export async function fetchPRData(owner, repo, prNumber) {
  const octokit = getOctokit();

  const [prRes, filesRes] = await Promise.all([
    octokit.rest.pulls.get({ owner, repo, pull_number: Number(prNumber) }),
    octokit.rest.pulls.listFiles({ owner, repo, pull_number: Number(prNumber), per_page: 30 })
  ]);

  const pr = prRes.data;
  const files = filesRes.data;

  // Build a compact diff string — skip binary/huge files
  const diffChunks = files
    .filter(f => f.patch && !f.filename.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|ttf|eot|bin|lock)$/i))
    .slice(0, 10)
    .map(f => [
      `### ${f.filename}  (+${f.additions} / -${f.deletions})`,
      f.patch.slice(0, 800)
    ].join('\n'));

  return {
    title: pr.title,
    body: pr.body || '',
    author: pr.user?.login || 'unknown',
    baseBranch: pr.base.ref,
    headBranch: pr.head.ref,
    headSha: pr.head.sha,
    mergedAt: pr.merged_at,
    files: files.map(f => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions
    })),
    diffText: diffChunks.join('\n\n'),
    totalAdditions: files.reduce((s, f) => s + f.additions, 0),
    totalDeletions: files.reduce((s, f) => s + f.deletions, 0)
  };
}

/**
 * Fetch the current README content (decoded from base64)
 */
export async function fetchReadme(owner, repo) {
  const octokit = getOctokit();
  try {
    const res = await octokit.rest.repos.getReadme({ owner, repo });
    const content = Buffer.from(res.data.content, 'base64').toString('utf-8');
    return { content, sha: res.data.sha, path: res.data.path };
  } catch (err) {
    if (err.status === 404) return { content: null, sha: null, path: 'README.md' };
    throw err;
  }
}

/**
 * Create a new branch + commit the updated README + open a PR
 */
export async function createDocsPR(owner, repo, options) {
  const {
    baseBranch,
    sourcePrNumber,
    sourcePrTitle,
    updatedReadme,
    readmeSha,
    readmePath,
    acceptedSections
  } = options;

  if (!process.env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN is required to create PRs. Add it to your .env file.');
  }

  const octokit = getOctokit();
  const newBranch = `docs/auto-update-pr-${sourcePrNumber}-${Date.now()}`;

  // Get the SHA of the base branch tip
  const baseRef = await octokit.rest.git.getRef({
    owner, repo,
    ref: `heads/${baseBranch}`
  });
  const baseSha = baseRef.data.object.sha;

  // Create new branch from base
  await octokit.rest.git.createRef({
    owner, repo,
    ref: `refs/heads/${newBranch}`,
    sha: baseSha
  });

  // Commit updated README to new branch
  await octokit.rest.repos.createOrUpdateFileContents({
    owner, repo,
    path: readmePath || 'README.md',
    message: `docs: auto-update for PR #${sourcePrNumber}`,
    content: Buffer.from(updatedReadme).toString('base64'),
    sha: readmeSha,
    branch: newBranch
  });

  // Build a descriptive PR body
  const sectionList = acceptedSections
    .map(s => `- **${s.heading}**: ${s.reason}`)
    .join('\n');

  const prBody = `## 📄 Auto Doc Updater

This PR was generated automatically by [Auto Doc Updater](https://github.com) based on the changes in PR #${sourcePrNumber}: _${sourcePrTitle}_.

### What changed
${sectionList}

---
*Review each section carefully before merging. Generated with ❤️ by Auto Doc Updater.*`;

  // Open the pull request
  const newPR = await octokit.rest.pulls.create({
    owner, repo,
    title: `docs: auto-update README for PR #${sourcePrNumber}`,
    body: prBody,
    head: newBranch,
    base: baseBranch
  });

  return {
    prUrl: newPR.data.html_url,
    prNumber: newPR.data.number,
    branch: newBranch
  };
}
