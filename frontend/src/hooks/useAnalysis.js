import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { runAnalysis, createDocsPR as apiCreatePR, safeErrorMessage } from '../utils/api.js';
import { supabase } from '../lib/supabaseClient.js';

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
  const [runId, setRunId] = useState(null);

  const persistRun = useCallback(async (repoUrl, prNumber, data) => {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (!userId) return null;

      const { data: runRow, error: runErr } = await supabase
        .from('analysis_runs')
        .insert({
          user_id: userId,
          repo_url: repoUrl,
          pr_number: Number(prNumber)
        })
        .select('id')
        .single();
      if (runErr || !runRow?.id) return null;

      const rows = (data?.analysis?.sections || []).map((s) => ({
        run_id: runRow.id,
        heading: s.heading || 'Untitled Section',
        old_text: s.oldText || '',
        new_text: s.newText || '',
        impact: s.impact || 'medium',
        confidence: Number(s.confidence) || 0,
        accepted: false
      }));
      if (rows.length > 0) {
        await supabase.from('section_suggestions').insert(rows);
      }
      return runRow.id;
    } catch {
      return null;
    }
  }, []);

  const go = useCallback(async (repoUrl, prNumber) => {
    setError(null);
    setResult(null);
    setAcceptedIds(new Set());
    setRejectedIds(new Set());
    setCreatedPR(null);
    setRunId(null);

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
      const newRunId = await persistRun(repoUrl, prNumber, data);
      setRunId(newRunId);
      setStage(STAGES.DONE);
      setStageLabel(STAGE_LABELS[STAGES.DONE]);
      const sections = Array.isArray(data?.analysis?.sections)
        ? data.analysis.sections
        : [];
      if (sections.length === 0) {
        toast.success('No README updates needed for this PR.');
      } else {
        toast.success(`Found ${sections.length} sections to update`);
      }
    } catch (err) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      const msg = safeErrorMessage(err);
      setError(msg);
      setStage(STAGES.ERROR);
      toast.error(msg);
    }
  }, [persistRun]);

  const accept = useCallback(async (id) => {
    setAcceptedIds(prev => { const s = new Set(prev); s.add(id); return s; });
    setRejectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    if (!runId || !result) return;
    const section = result.analysis.sections.find(s => s.id === id);
    if (!section) return;
    await supabase
      .from('section_suggestions')
      .update({ accepted: true })
      .eq('run_id', runId)
      .eq('heading', section.heading);
  }, [runId, result]);

  const reject = useCallback(async (id) => {
    setRejectedIds(prev => { const s = new Set(prev); s.add(id); return s; });
    setAcceptedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    if (!runId || !result) return;
    const section = result.analysis.sections.find(s => s.id === id);
    if (!section) return;
    await supabase
      .from('section_suggestions')
      .update({ accepted: false })
      .eq('run_id', runId)
      .eq('heading', section.heading);
  }, [runId, result]);

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
      toast.error(safeErrorMessage(err) || 'PR creation failed.');
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
    setRunId(null);
  }, []);

  const updateSectionText = useCallback(async (id, newText) => {
    setResult(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        analysis: {
          ...prev.analysis,
          sections: prev.analysis.sections.map((s) =>
            s.id === id ? { ...s, newText } : s
          )
        }
      };
    });
    if (!runId || !result) return;
    const section = result.analysis.sections.find(s => s.id === id);
    if (!section) return;
    await supabase
      .from('section_suggestions')
      .update({ new_text: newText })
      .eq('run_id', runId)
      .eq('heading', section.heading);
  }, [runId, result]);

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
    go, accept, reject, acceptAll, resetAll, createPR, reset, updateSectionText
  };
}
