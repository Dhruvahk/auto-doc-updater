import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { runAnalysis, createDocsPR as apiCreatePR } from '../utils/api.js';

export const STAGES = {
  IDLE: 'idle',
  FETCHING_PR: 'fetching_pr',
  FETCHING_README: 'fetching_readme',
  ANALYZING: 'analyzing',
  DONE: 'done',
  ERROR: 'error'
};

const STAGE_LABELS = {
  [STAGES.FETCHING_PR]: 'Fetching PR diff from GitHub...',
  [STAGES.FETCHING_README]: 'Reading current README...',
  [STAGES.ANALYZING]: 'Sending to Claude for analysis...',
  [STAGES.DONE]: 'Analysis complete',
};

export function useAnalysis() {
  const [stage, setStage] = useState(STAGES.IDLE);
  const [stageLabel, setStageLabel] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [acceptedIds, setAcceptedIds] = useState(new Set());
  const [rejectedIds, setRejectedIds] = useState(new Set());
  const [prCreating, setPrCreating] = useState(false);
  const [createdPR, setCreatedPR] = useState(null);

  const go = useCallback(async (repoUrl, prNumber) => {
    setError(null);
    setResult(null);
    setAcceptedIds(new Set());
    setRejectedIds(new Set());
    setCreatedPR(null);

    // Simulate staged progress (the API does it all in one call,
    // so we animate through stages while waiting)
    setStage(STAGES.FETCHING_PR);
    setStageLabel(STAGE_LABELS[STAGES.FETCHING_PR]);

    const timer1 = setTimeout(() => {
      setStage(STAGES.FETCHING_README);
      setStageLabel(STAGE_LABELS[STAGES.FETCHING_README]);
    }, 1200);

    const timer2 = setTimeout(() => {
      setStage(STAGES.ANALYZING);
      setStageLabel(STAGE_LABELS[STAGES.ANALYZING]);
    }, 2800);

    try {
      const data = await runAnalysis(repoUrl, prNumber);
      clearTimeout(timer1);
      clearTimeout(timer2);
      setResult(data);
      setStage(STAGES.DONE);
      setStageLabel(STAGE_LABELS[STAGES.DONE]);
      toast.success(`Found ${data.analysis.sections.length} sections to update`);
    } catch (err) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setError(err.message);
      setStage(STAGES.ERROR);
      toast.error(err.message);
    }
  }, []);

  const accept = useCallback((id) => {
    setAcceptedIds(prev => { const s = new Set(prev); s.add(id); return s; });
    setRejectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  }, []);

  const reject = useCallback((id) => {
    setRejectedIds(prev => { const s = new Set(prev); s.add(id); return s; });
    setAcceptedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  }, []);

  const acceptAll = useCallback(() => {
    if (!result) return;
    setAcceptedIds(new Set(result.analysis.sections.map(s => s.id)));
    setRejectedIds(new Set());
  }, [result]);

  const resetAll = useCallback(() => {
    setAcceptedIds(new Set());
    setRejectedIds(new Set());
  }, []);

  const createPR = useCallback(async () => {
    if (!result || acceptedIds.size === 0) {
      toast.error('Accept at least one section first.');
      return;
    }
    setPrCreating(true);
    try {
      const res = await apiCreatePR({
        repoUrl: `https://github.com/${result.repo.owner}/${result.repo.repo}`,
        baseBranch: result.pr.baseBranch,
        sourcePrNumber: result.pr.number,
        sourcePrTitle: result.pr.title,
        readmeContent: result.readme.content,
        readmeSha: result.readme.sha,
        readmePath: result.readme.path,
        sections: result.analysis.sections,
        acceptedIds: Array.from(acceptedIds)
      });
      setCreatedPR(res);
      toast.success('PR created on GitHub!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPrCreating(false);
    }
  }, [result, acceptedIds]);

  const reset = useCallback(() => {
    setStage(STAGES.IDLE);
    setResult(null);
    setError(null);
    setAcceptedIds(new Set());
    setRejectedIds(new Set());
    setCreatedPR(null);
  }, []);

  // Derive the patched README from accepted changes
  const patchedReadme = (() => {
    if (!result) return '';
    let content = result.readme.content;
    for (const section of result.analysis.sections) {
      if (!acceptedIds.has(section.id)) continue;
      if (section.oldText && content.includes(section.oldText)) {
        content = content.replace(section.oldText, section.newText);
      }
    }
    return content;
  })();

  return {
    stage, stageLabel, result, error,
    acceptedIds, rejectedIds,
    prCreating, createdPR,
    patchedReadme,
    go, accept, reject, acceptAll, resetAll, createPR, reset
  };
}
