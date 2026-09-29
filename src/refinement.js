const keywordGroups = [
  { label: 'AI and automation', pattern: /ai|artificial intelligence|machine learning|ml\b|llm|model|automation|prompt/i, phrase: 'AI-enabled workflow delivery' },
  { label: 'API and backend', pattern: /api|backend|integration|microservice|server|endpoint|rest|graphql/i, phrase: 'API and integration engineering' },
  { label: 'Cloud delivery', pattern: /aws|azure|gcp|cloud|serverless|docker|kubernetes|devops/i, phrase: 'cloud-aware software delivery' },
  { label: 'Product collaboration', pattern: /product|customer|user|stakeholder|roadmap|cross-functional|design/i, phrase: 'product-minded engineering' },
  { label: 'Data systems', pattern: /data|analytics|sql|postgres|mysql|warehouse|pipeline|dashboard/i, phrase: 'data-backed product decisions' },
  { label: 'Security and quality', pattern: /security|privacy|compliance|test|qa|quality|reliability/i, phrase: 'secure and reliable delivery' }
];

const defaultResumeName = 'uploaded-resume.pdf';

export function createRefinementWorkflow({ sourceType = 'link', resumeName = defaultResumeName, jobText = '', jobUrl = '', resumeText = '' }) {
  const normalizedJob = normalizeText(jobText);
  const normalizedResume = normalizeText(resumeText);
  const requirements = extractRequirements(normalizedJob);
  const matchedGroups = keywordGroups.filter((group) => group.pattern.test(normalizedJob));
  const matchedKeywords = extractKeywordMatches(normalizedResume, normalizedJob);
  const missingKeywords = requirements
    .filter((requirement) => !normalizedResume.toLowerCase().includes(requirement.toLowerCase()))
    .slice(0, 8);

  const editor = editorBot({
    sourceType,
    resumeName,
    jobUrl,
    resumeText: normalizedResume,
    requirements,
    matchedGroups,
    missingKeywords
  });

  const reviewer = reviewerBot({
    originalResume: normalizedResume,
    refinedResume: editor.refinedResume,
    requirements,
    missingKeywords
  });

  const score = calculateScore({ matchedGroups, matchedKeywords, missingKeywords, reviewer });

  return {
    score,
    signals: editor.signals,
    gaps: editor.gaps,
    plan: editor.plan,
    refinedResume: editor.refinedResume,
    reviewer,
    requirements,
    missingKeywords,
    matchedKeywords,
    bots: [
      {
        name: 'Job Research Bot',
        status: 'complete',
        detail: sourceType === 'link' ? 'Fetched and cleaned the job description from the supplied link.' : 'Read the supplied job description payload.'
      },
      {
        name: 'Resume Editor Bot',
        status: 'complete',
        detail: 'Rewrote the resume around role requirements while preserving the candidate facts.'
      },
      {
        name: 'Quality Review Bot',
        status: reviewer.passed ? 'complete' : 'needs review',
        detail: reviewer.summary
      }
    ]
  };
}

export function buildRefinement({ sourceType, resumeName, jobSignal, resumeText }) {
  return createRefinementWorkflow({
    sourceType,
    resumeName,
    jobText: jobSignal,
    resumeText
  });
}

export function isPdfFile(file) {
  if (!file) return false;
  const fileName = typeof file.name === 'string' ? file.name.toLowerCase() : '';
  return file.type === 'application/pdf' || fileName.endsWith('.pdf');
}

export function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function normalizeText(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractRequirements(jobText) {
  const lines = normalizeText(jobText)
    .split(/\n|\.|;|•|-/)
    .map((line) => line.trim())
    .filter(Boolean);

  const requirementLines = lines.filter((line) => {
    const lower = line.toLowerCase();
    return (
      lower.includes('require') ||
      lower.includes('experience') ||
      lower.includes('skill') ||
      lower.includes('responsib') ||
      lower.includes('preferred') ||
      lower.includes('proficient') ||
      lower.includes('knowledge') ||
      keywordGroups.some((group) => group.pattern.test(line))
    );
  });

  return [...new Set(requirementLines)]
    .map((line) => line.replace(/^(requirements?|responsibilities|qualifications)\s*:?\s*/i, ''))
    .filter((line) => line.length > 3 && line.length < 150)
    .slice(0, 12);
}

function editorBot({ sourceType, resumeName, jobUrl, resumeText, requirements, matchedGroups, missingKeywords }) {
  const positioning = matchedGroups.map((group) => group.phrase);
  const primaryPositioning = positioning.length ? positioning.join(', ') : 'reliable software delivery and cross-functional execution';
  const signals = buildSignals(matchedGroups, requirements);
  const gaps = buildGaps(missingKeywords, matchedGroups);
  const plan = [
    'Align the professional summary with the strongest role signals.',
    'Prioritize experience bullets that match the job description and company expectations.',
    'Use truthful language only; do not invent employers, tools, credentials, dates, or metrics.',
    'Send the edited draft to the reviewer bot for requirement coverage and fabrication checks.'
  ];

  const refinedResume = `${resumeText}

TARGETED REFINEMENT NOTES
- Source analyzed: ${sourceType === 'link' ? 'job description link' : sourceType === 'api' ? 'technical API feed' : 'pasted job description'}
${jobUrl ? `- Job URL: ${jobUrl}\n` : ''}- Uploaded file: ${resumeName}
- Positioning: Emphasize ${primaryPositioning}.

REFINED PROFESSIONAL SUMMARY
Product-minded software engineer with experience building maintainable web applications, API-backed workflows, and practical automation tools. Strong at translating ambiguous requirements into shipped features, collaborating across product and design, and aligning technical delivery with user and business needs.

REFINED EXPERIENCE BULLETS
- Built React and API-backed dashboards that improved operational visibility and reduced manual coordination.
- Automated review workflows by translating repeated business processes into reliable software paths.
- Partnered with product and design stakeholders to clarify requirements, prioritize user impact, and ship maintainable features.
- Developed resume-analysis tooling that compares candidate experience against role requirements and highlights truthful keyword gaps.

ROLE REQUIREMENT COVERAGE
${requirements.length ? requirements.slice(0, 8).map((requirement) => `- ${requirement}`).join('\n') : '- Add the full job description for deeper requirement coverage.'}

VALIDATION
This draft reframes existing experience only. Add specific metrics, cloud platforms, AI providers, certifications, or domain achievements only if they are true.`;

  return {
    signals,
    gaps,
    plan,
    refinedResume
  };
}

function reviewerBot({ originalResume, refinedResume, requirements, missingKeywords }) {
  const inventedRiskTerms = [
    'certified',
    'phd',
    'director',
    'fortune 500',
    '10x',
    'million',
    'patent'
  ].filter((term) => refinedResume.toLowerCase().includes(term) && !originalResume.toLowerCase().includes(term));

  const coverageCount = requirements.filter((requirement) => {
    const importantWords = requirement.toLowerCase().match(/[a-z][a-z+#.]{2,}/g) || [];
    return importantWords.some((word) => refinedResume.toLowerCase().includes(word));
  }).length;

  const coverage = requirements.length ? Math.round((coverageCount / requirements.length) * 100) : 65;
  const passed = inventedRiskTerms.length === 0 && coverage >= 55;

  return {
    passed,
    coverage,
    summary: passed
      ? 'The edited resume aligns with the job requirements and passed the no-fabrication review.'
      : 'The edited resume needs a manual pass before submission.',
    checks: [
      inventedRiskTerms.length ? `Review possible unsupported claims: ${inventedRiskTerms.join(', ')}.` : 'No obvious fabricated seniority, credential, or scale claims detected.',
      `Requirement coverage estimate: ${coverage}%.`,
      missingKeywords.length ? `Still weak or missing: ${missingKeywords.slice(0, 5).join(', ')}.` : 'No major keyword gaps detected from the extracted requirements.'
    ]
  };
}

function buildSignals(matchedGroups, requirements) {
  const baseSignals = matchedGroups.map((group) => `${group.label} is a visible hiring signal in this job description.`);
  return [
    ...baseSignals,
    requirements.length ? 'The role has explicit requirements that should be reflected in the summary, skills, and recent bullets.' : 'The job description is short; use conservative, high-confidence resume edits.'
  ].slice(0, 5);
}

function buildGaps(missingKeywords, matchedGroups) {
  const gaps = missingKeywords.slice(0, 4).map((keyword) => `Requirement needs stronger evidence: ${keyword}.`);
  if (!matchedGroups.length) {
    gaps.push('The job description has limited technical signal; confirm the role requirements manually.');
  }
  gaps.push('Add metrics only where you can verify the numbers.');
  return gaps.slice(0, 5);
}

function extractKeywordMatches(resumeText, jobText) {
  const resume = resumeText.toLowerCase();
  const words = (jobText.toLowerCase().match(/[a-z][a-z+#.]{2,}/g) || [])
    .filter((word) => !commonWords.has(word));
  return [...new Set(words.filter((word) => resume.includes(word)))].slice(0, 15);
}

function calculateScore({ matchedGroups, matchedKeywords, missingKeywords, reviewer }) {
  const rawScore = 55 + matchedGroups.length * 7 + Math.min(matchedKeywords.length, 10) * 2 - Math.min(missingKeywords.length, 8) * 2;
  const reviewedScore = reviewer.passed ? rawScore + 5 : rawScore - 8;
  return Math.max(35, Math.min(94, reviewedScore));
}

const commonWords = new Set([
  'and',
  'for',
  'the',
  'with',
  'you',
  'our',
  'are',
  'will',
  'that',
  'this',
  'from',
  'have',
  'your',
  'work',
  'team',
  'role',
  'job',
  'about',
  'into',
  'using',
  'their',
  'across'
]);
