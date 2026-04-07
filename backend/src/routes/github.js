import { Router } from 'express';
import { parseGitHubUrl, createDocsPR } from '../services/github.js';
import { applyAcceptedChanges } from '../services/llm.js';

const router = Router();

/**
 * POST /api/github/create-pr
 * Body: {
 *   repoUrl, baseBranch, sourcePrNumber, sourcePrTitle,
 *   readmeContent, readmeSha, readmePath,
 *   sections, acceptedIds
 * }
 */
router.post('/create-pr', async (req, res, next) => {
  try {
    const {
      repoUrl,
      baseBranch,
      sourcePrNumber,
      sourcePrTitle,
      readmeContent,
      readmeSha,
      readmePath,
      sections,
      acceptedIds
    } = req.body;

    if (!repoUrl || !sections || !acceptedIds?.length) {
      return res.status(400).json({
        error: 'repoUrl, sections, and acceptedIds are required.'
      });
    }

    const { owner, repo } = parseGitHubUrl(repoUrl);

    // Apply accepted changes to README
    const { updatedReadme, appliedIds } = applyAcceptedChanges(
      readmeContent,
      sections,
      acceptedIds
    );

    if (appliedIds.length === 0) {
      return res.status(400).json({
        error: 'None of the accepted sections could be matched in the README. The text may have drifted.'
      });
    }

    const acceptedSections = sections.filter(s => appliedIds.includes(s.id));

    // Create the GitHub PR
    const result = await createDocsPR(owner, repo, {
      baseBranch,
      sourcePrNumber,
      sourcePrTitle,
      updatedReadme,
      readmeSha,
      readmePath,
      acceptedSections
    });

    res.json({
      success: true,
      prUrl: result.prUrl,
      prNumber: result.prNumber,
      branch: result.branch,
      appliedCount: appliedIds.length
    });
  } catch (err) {
    if (err.message?.includes('GITHUB_TOKEN')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/github/token-status
 * Check if GitHub token is configured and has write access
 */
router.get('/token-status', (req, res) => {
  res.json({
    configured: !!process.env.GITHUB_TOKEN,
    message: process.env.GITHUB_TOKEN
      ? 'GitHub token is configured. Auto-PR feature is available.'
      : 'No GitHub token. Add GITHUB_TOKEN to .env to enable auto-PR creation.'
  });
});

export default router;
