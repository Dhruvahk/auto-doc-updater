import { Router } from 'express';
import { parseGitHubUrl, fetchPRData, fetchReadme } from '../services/github.js';
import { analyzeAndSuggestUpdates } from '../services/llm.js';

const router = Router();

/**
 * POST /api/analysis/run
 * Body: { repoUrl, prNumber }
 */
router.post('/run', async (req, res, next) => {
  try {
    const { repoUrl, prNumber } = req.body;

    if (!repoUrl || !prNumber) {
      return res.status(400).json({ error: 'repoUrl and prNumber are required.' });
    }
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY not configured on server.' });
    }

    // Step 1: Parse the GitHub URL
    const { owner, repo } = parseGitHubUrl(repoUrl);

    // Step 2: Fetch PR data + README in parallel
    let prData, readmeResult;
    try {
      [prData, readmeResult] = await Promise.all([
        fetchPRData(owner, repo, prNumber),
        fetchReadme(owner, repo)
      ]);
    } catch (err) {
      if (err.status === 404) {
        return res.status(404).json({
          error: `PR #${prNumber} not found in ${owner}/${repo}. Check the repo URL and PR number.`
        });
      }
      throw err;
    }

    if (!readmeResult.content) {
      return res.status(404).json({
        error: `No README found in ${owner}/${repo}. This tool requires a README to analyze.`
      });
    }

    // Step 3: LLM analysis
    const analysis = await analyzeAndSuggestUpdates(prData, readmeResult.content);

    res.json({
      repo: { owner, repo },
      pr: {
        number: Number(prNumber),
        title: prData.title,
        author: prData.author,
        baseBranch: prData.baseBranch,
        headBranch: prData.headBranch,
        files: prData.files,
        totalAdditions: prData.totalAdditions,
        totalDeletions: prData.totalDeletions,
        diffText: prData.diffText
      },
      readme: {
        content: readmeResult.content,
        sha: readmeResult.sha,
        path: readmeResult.path
      },
      analysis,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
