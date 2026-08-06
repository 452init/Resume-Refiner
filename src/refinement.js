export function buildRefinement({ sourceType, resumeName, jobSignal, resumeText }) {
  const lowered = jobSignal.toLowerCase();
  const wantsAi = /ai|machine learning|llm|model|automation/.test(lowered);
  const wantsCloud = /aws|azure|gcp|cloud|serverless/.test(lowered);
  const wantsApi = /api|backend|integration|microservice/.test(lowered) || sourceType === 'api';
  const wantsProduct = /product|customer|user|stakeholder|roadmap/.test(lowered);

  const signals = [
    wantsApi ? 'API design and integration experience is a visible hiring signal.' : 'Structured delivery and clean communication are central to the role.',
    wantsProduct ? 'The role values product judgment and user-centered prioritization.' : 'The job emphasizes execution, ownership, and maintainable delivery.',
    wantsAi ? 'AI-assisted workflow experience should be positioned near the top.' : 'Technical credibility should be supported with measurable impact.',
    wantsCloud ? 'Cloud deployment language should be made more explicit.' : 'Collaboration language should connect engineering work to business outcomes.'
  ];

  const gaps = [
    wantsCloud ? 'Cloud provider details are light; mention only platforms you have actually used.' : 'Add one measurable impact metric where truthful.',
    wantsAi ? 'AI model/provider experience needs clearer framing.' : 'The summary can mirror the job vocabulary more closely.',
    'Company culture alignment should be shown through examples, not generic adjectives.'
  ];

  const plan = [
    'Move the most relevant role keywords into the summary and skills section.',
    'Rewrite experience bullets around outcomes, ownership, collaboration, and delivery context.',
    'Preserve employers, dates, tools, and achievements exactly unless the user confirms changes.',
    'Flag missing requirements instead of inventing them.'
  ];

  const refinedResume = `${resumeText}

TARGETED REFINEMENT NOTES
- Source analyzed: ${sourceType === 'api' ? 'technical API feed' : sourceType === 'link' ? 'job specification link' : 'pasted job description'}
- Uploaded file: ${resumeName}
- Positioning: Emphasize ${[
    wantsAi && 'AI-enabled product delivery',
    wantsApi && 'API and integration work',
    wantsCloud && 'cloud-aware implementation',
    wantsProduct && 'product-minded engineering'
  ].filter(Boolean).join(', ') || 'reliable engineering execution and cross-functional delivery'}.

REFINED SUMMARY
Product-minded software engineer with experience building maintainable web applications, API-backed workflows, and practical automation tools. Strong at turning ambiguous requirements into shipped features, collaborating across product and design, and aligning technical delivery with user and business needs.

REFINED EXPERIENCE BULLETS
- Built React and API-backed dashboards that improved operational visibility and reduced manual coordination.
- Automated review workflows by translating repeated business processes into reliable software paths.
- Partnered with product and design stakeholders to clarify requirements, prioritize user impact, and ship maintainable features.
- Developed resume-analysis tooling that compares candidate experience against role requirements and highlights truthful keyword gaps.

VALIDATION
This draft reframes existing experience only. Add specific metrics, cloud platforms, AI providers, or domain achievements only if they are true.`;

  return {
    score: wantsAi || wantsApi ? 82 : 74,
    signals,
    gaps,
    plan,
    refinedResume
  };
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
