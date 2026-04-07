import Groq from 'groq-sdk';

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured on server.');
  }
  return new Groq({ apiKey });
}

const SYSTEM_PROMPT = `You are a senior documentation engineer specializing in keeping README files and API docs in sync with code changes.

Your job is to:
1. Analyze a GitHub PR diff
2. Identify ONLY the README sections that are directly affected by the code change
3. Suggest targeted rewrites — never touch unrelated sections
4. Be surgical: change the minimum needed to make the docs accurate again

Rules:
- Never rewrite sections that aren't impacted by the diff
- Keep the same writing tone and style as the original
- Prefer concrete examples over abstract descriptions
- If a feature was added, document it; if removed, delete its docs
- Your JSON must be valid — no trailing commas, no comments`;

/**
 * Build the user prompt sent to the LLM
 */
function buildPrompt(prTitle, prBody, diffText, readmeContent) {
  return `A developer just merged this pull request:

**Title:** ${prTitle}
**Description:** ${prBody || '(no description provided)'}

**PR Diff (truncated to most important parts):**
\`\`\`diff
${diffText.slice(0, 3000)}
\`\`\`

**Current README:**
\`\`\`markdown
${readmeContent.slice(0, 4000)}
\`\`\`

Analyze the diff and identify which README sections need updating. Return ONLY a JSON object — no markdown fences, no preamble, no explanation outside JSON.

Required shape:
{
  "summary": "One sentence describing what changed in the code",
  "sectionsAffected": 3,
  "sections": [
    {
      "id": "s1",
      "heading": "## Section Heading",
      "oldText": "exact verbatim text from README that needs changing (2-5 sentences max)",
      "newText": "your suggested replacement (same length, same style)",
      "impact": "high" | "medium" | "low",
      "confidence": 92,
      "reason": "one sentence: why this section needs updating",
      "changeType": "update" | "add" | "remove"
    }
  ]
}

Impact levels:
- high: docs are now incorrect and will mislead users
- medium: docs are incomplete or missing new functionality  
- low: minor clarification or example update

Return 2-5 sections maximum. Only include sections with genuine impact.`;
}

/**
 * Main analysis function — returns structured suggestions
 */
export async function analyzeAndSuggestUpdates(prData, readmeContent) {
  const client = getGroqClient();
  const prompt = buildPrompt(
    prData.title,
    prData.body,
    prData.diffText,
    readmeContent
  );

  const completion = await client.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    max_tokens: 2000,
    temperature: 0.2,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ]
  });

  const raw = completion.choices?.[0]?.message?.content || '';

  // Strip any accidental markdown fences
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch (err) {
    throw new Error(`LLM returned invalid JSON. Raw response: ${raw.slice(0, 300)}`);
  }

  // Validate and normalise
  if (!Array.isArray(parsed.sections)) {
    throw new Error('LLM response missing "sections" array');
  }

  return {
    summary: parsed.summary || 'Documentation sync suggested.',
    sectionsAffected: parsed.sections.length,
    sections: parsed.sections.map((s, i) => ({
      id: s.id || `s${i + 1}`,
      heading: s.heading || 'Untitled Section',
      oldText: s.oldText || '',
      newText: s.newText || '',
      impact: ['high', 'medium', 'low'].includes(s.impact) ? s.impact : 'medium',
      confidence: Math.min(100, Math.max(0, Number(s.confidence) || 80)),
      reason: s.reason || 'Section affected by code change.',
      changeType: ['update', 'add', 'remove'].includes(s.changeType) ? s.changeType : 'update'
    })),
    usage: {
      inputTokens: completion.usage?.prompt_tokens ?? null,
      outputTokens: completion.usage?.completion_tokens ?? null
    }
  };
}

/**
 * Apply accepted section changes to the README string
 */
export function applyAcceptedChanges(readmeContent, sections, acceptedIds) {
  let updated = readmeContent;
  const applied = [];

  for (const section of sections) {
    if (!acceptedIds.includes(section.id)) continue;
    if (!section.oldText || !updated.includes(section.oldText)) {
      // Fuzzy fallback — try trimmed match
      const trimmed = section.oldText?.trim();
      if (trimmed && updated.includes(trimmed)) {
        updated = updated.replace(trimmed, section.newText);
        applied.push(section.id);
      }
      continue;
    }
    updated = updated.replace(section.oldText, section.newText);
    applied.push(section.id);
  }

  return { updatedReadme: updated, appliedIds: applied };
}
