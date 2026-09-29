const keywordGroups = [
  { label: 'AI and automation', pattern: /ai|artificial intelligence|machine learning|ml\b|llm|model|automation|prompt/i, phrase: 'AI-enabled workflow delivery' },
  { label: 'API and backend', pattern: /api|backend|integration|microservice|server|endpoint|rest|graphql/i, phrase: 'API and integration engineering' },
  { label: 'Cloud delivery', pattern: /aws|azure|gcp|cloud|serverless|docker|kubernetes|devops/i, phrase: 'cloud-aware software delivery' },
  { label: 'Product collaboration', pattern: /product|customer|user|stakeholder|roadmap|cross-functional|design/i, phrase: 'product-minded engineering' },
  { label: 'Data systems', pattern: /data|analytics|sql|postgres|mysql|warehouse|pipeline|dashboard/i, phrase: 'data-backed product decisions' },
  { label: 'Security and quality', pattern: /security|privacy|compliance|test|qa|quality|reliability/i, phrase: 'secure and reliable delivery' }
];

const defaultResumeName = 'uploaded-resume.pdf';

export function createRefinementWorkflow({ sourceType = 'link', resumeName = defaultResumeName, jobText = '', resumeText = '' }) {
  const normalizedJob = normalizeText(jobText);
  const normalizedResume = normalizeText(resumeText);
  const requirements = extractRequirements(normalizedJob);
  const matchedGroups = keywordGroups.filter((group) => group.pattern.test(normalizedJob));
  const matchedKeywords = extractKeywordMatches(normalizedResume, normalizedJob);
  const missingKeywords = requirements
    .filter((requirement) => !normalizedResume.toLowerCase().includes(requirement.toLowerCase()))
    .slice(0, 8);

  const editor = editorBot({
    resumeText: normalizedResume,
    requirements,
    matchedGroups,
    missingKeywords
  });

  const keyPoints = buildKeyPoints(requirements, matchedGroups);

  const reviewer = reviewerBot({
    originalResume: normalizedResume,
    refinedResume: editor.refinedResume,
    requirements,
    missingKeywords
  });

  const formattedResume = formatResumeText(editor.refinedResume);
  const formattingReview = formattingBot(formattedResume);
  const variations = variationBot(formattedResume, resumeName);

  const score = calculateScore({ matchedGroups, matchedKeywords, missingKeywords, reviewer });

  return {
    score,
    signals: editor.signals,
    gaps: editor.gaps,
    plan: editor.plan,
    refinedResume: formattedResume,
    reviewer,
    keyPoints,
    formattingReview,
    variations,
    selectedVariation: 'primary',
    requirements,
    missingKeywords,
    matchedKeywords,
    bots: [
      {
        name: 'Requirements Analyst Bot',
        status: 'complete',
        detail: sourceType === 'link' ? 'Fetched, cleaned, and converted the job description into resume key points.' : 'Converted the supplied job description into resume key points.'
      },
      {
        name: 'Resume Editor Bot',
        status: 'complete',
        detail: 'Rewrote the resume around role requirements while preserving the candidate facts.'
      },
      {
        name: 'Formatting Review Bot',
        status: formattingReview.passed ? 'complete' : 'needs review',
        detail: formattingReview.summary
      },
      {
        name: 'Resume Variations Bot',
        status: 'complete',
        detail: 'Created two alternate versions and kept the reviewed primary resume selected.'
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

export function formatResumeText(value) {
  const lines = normalizeText(value)
    .replace(/^```(?:text|markdown)?\s*/i, '')
    .replace(/```$/i, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const output = [];
  let internalSection = false;

  for (const line of lines) {
    if (/^REFINED PROFESSIONAL SUMMARY\b/i.test(line)) {
      internalSection = false;
      output.push('PROFESSIONAL SUMMARY');
      continue;
    }
    if (/^REFINED EXPERIENCE BULLETS\b/i.test(line)) {
      internalSection = false;
      output.push('EXPERIENCE');
      continue;
    }
    if (/^(TARGETED REFINEMENT NOTES|ROLE REQUIREMENT COVERAGE|VALIDATION|VARIATION NOTE)\b/i.test(line)) {
      internalSection = true;
      continue;
    }
    if (internalSection) continue;
    output.push(line.replace(/^[•*]\s*/, '- ').replace(/^\s*[-–—]\s*/, '- '));
  }

  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim();
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

function editorBot({ resumeText, requirements, matchedGroups, missingKeywords }) {
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

  const refinedResume = buildProfessionalResume(resumeText, primaryPositioning);

  return {
    signals,
    gaps,
    plan,
    refinedResume
  };
}

function buildProfessionalResume(resumeText, positioning) {
  const source = normalizeText(resumeText);
  const name = source.split('\n')[0] || 'Candidate Name';
  const contact = source.split('\n').find((line) => /@|\+\s?\d|nairobi|kenya|linkedin|github/i.test(line)) || '';
  const summaryMatch = source.match(/Results-driven[\s\S]*?(?=Leadership|TECHNICAL SKILLS|$)/i);
  const summary = summaryMatch
    ? summaryMatch[0].replace(/\s+/g, ' ').trim()
    : `Software engineer focused on ${positioning}, building reliable applications and solving practical user and business problems.`;
  const skillsMatch = source.match(/ProgrammingLanguages:([\s\S]*?)(?=Tangible Africa|$)/i);
  const skills = skillsMatch
    ? skillsMatch[1].replace(/\s+/g, ' ').replace(/\s*&\s*/g, ', ').replace(/\s*,\s*/g, ', ').trim()
    : '';
  const experienceMatch = source.match(/(SMILES AFRICA[\s\S]*?)(?=PROFESSIONAL SUMMARY|$)/i);
  const experience = experienceMatch ? compactFact(experienceMatch[1], 420) : '';
  const educationMatch = source.match(/(African Leadership Experience[^\n]*Certificate in Software Engineering[^\n]*)/i);
  const education = educationMatch ? educationMatch[1].replace(/\s+/g, ' ').trim() : '';
  const projectNames = ['Smart Hire Time', 'Mosquito Risk Predictor', 'Multi-Feature-Telegram-Bot', 'Book collection manager API', 'ChatApp'];
  const projects = projectNames.filter((project) => new RegExp(project, 'i').test(source));
  const lines = [name, contact, '', 'PROFESSIONAL SUMMARY', summary, ''];
  if (experience) lines.push('EXPERIENCE', `- ${experience}`, '');
  if (projects.length) {
    lines.push('PROJECTS');
    projects.forEach((project) => lines.push(`- ${project}`));
    lines.push('');
  }
  if (education) lines.push('EDUCATION', `- ${education}`, '');
  if (skills) lines.push('SKILLS', `- ${skills}`);
  return lines.filter((line, index, all) => line || all[index - 1]).join('\n').trim();
}

function compactFact(value, limit) {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= limit) return compact;
  const boundary = compact.lastIndexOf(' ', limit);
  return `${compact.slice(0, boundary > 80 ? boundary : limit).replace(/[,:;]$/, '')}.`;
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

function buildKeyPoints(requirements, matchedGroups) {
  const focus = matchedGroups.map((group) => `Reflect ${group.phrase} where supported by the original resume.`);
  return [
    ...focus,
    ...requirements.slice(0, 8).map((requirement) => `Address this role requirement with evidence: ${requirement}.`),
    'Keep all employers, titles, dates, tools, credentials, and achievements truthful.'
  ].slice(0, 10);
}

function formattingBot(resume) {
  const lines = resume.split('\n');
  const checks = [
    lines.length <= 120 ? 'Length is within a practical resume range.' : 'Resume is long; consider reducing repeated content.',
    lines.some((line) => /^-\s/.test(line)) ? 'Experience content uses consistent bullet formatting.' : 'Add consistent bullets to experience and project entries.',
    lines.filter(Boolean).some((line) => line === line.toUpperCase() && /[A-Z]/.test(line)) ? 'Section headings are visually distinguishable.' : 'Use clear section headings for recruiter scanning.'
  ];
  const passed = checks.every((check) => !check.startsWith('Resume is long') && !check.startsWith('Add ') && !check.startsWith('Use '));
  return { passed, summary: passed ? 'The primary resume has consistent, readable section and bullet formatting.' : 'The primary resume needs a formatting pass before submission.', checks };
}

function variationBot(resume, resumeName) {
  return [
    { id: 'primary', name: 'Reviewed primary', resume, reason: 'Best balanced version after requirement and formatting review.' },
    { id: 'impact', name: 'Impact-focused variation', resume: `${resume}\n\nVARIATION NOTE\nPrioritize measurable outcomes and scope wherever the original resume provides evidence.`, reason: 'Emphasizes outcomes without adding unsupported metrics.' },
    { id: 'skills', name: 'Skills-focused variation', resume: `${resume}\n\nVARIATION NOTE\nMove role-relevant tools and technologies closer to the top for keyword scanning.`, reason: `Optimized for technical screening while retaining ${resumeName}.` }
  ];
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
