import dns from 'node:dns/promises';
import net from 'node:net';
import { createRefinementWorkflow, normalizeText } from '../src/refinement.js';

const maxBodySize = 150_000;
const maxFetchedBytes = 1_200_000;
const fetchTimeoutMs = 10_000;

export default async function handler(request, response) {
  setSecurityHeaders(response);

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = await readJsonBody(request);
    const resumeText = normalizeText(payload.resumeText);
    const resumeName = String(payload.resumeName || 'uploaded-resume.pdf').slice(0, 120);
    const jobUrl = String(payload.jobUrl || '').trim();
    const pastedJobText = normalizeText(payload.jobText);

    if (resumeText.length < 80) {
      return response.status(400).json({ error: 'Resume text is too short to refine.' });
    }

    const source = jobUrl ? await fetchJobDescription(jobUrl) : { text: pastedJobText, url: '' };
    if (source.text.length < 80) {
      return response.status(400).json({ error: 'Job description is too short or could not be extracted.' });
    }

    const workflowInput = {
      sourceType: jobUrl ? 'link' : 'text',
      resumeName,
      jobUrl: source.url,
      jobText: source.text,
      resumeText
    };
    const result = hasAiProvider() ? await runAiWorkflow(workflowInput) : createRefinementWorkflow(workflowInput);

    return response.status(200).json({
      ...result,
      jobDescription: source.text.slice(0, 5000),
      sourceUrl: source.url
    });
  } catch (error) {
    return response.status(error.statusCode || 500).json({
      error: error.publicMessage || 'Unable to refine the resume right now.'
    });
  }
}

function hasAiProvider() {
  return Boolean(process.env.OPENAI_API_KEY || process.env.MISTRAL_API_KEY || process.env.GROQ_API_KEY);
}

async function runAiWorkflow({ sourceType, resumeName, jobText, resumeText }) {
  const analyst = await callAiBot({
    system: `You are the Job Requirements Analyst Bot. Read the job description and produce a precise tailoring brief for the resume editor. Extract the most important responsibilities, required skills, preferred skills, keywords, seniority signals, and formatting expectations. Never infer requirements that are not supported by the job description. Return only valid JSON with keys: keyPoints (string[]), requirements (string[]), priorities (string[]), formattingExpectations (string[]).`,
    prompt: `Job description:\n${jobText}`
  });
  const editor = await callAiBot({
    system: `You are the Resume Editor Bot. Use the requirements analyst brief to tailor the resume. Preserve employers, titles, dates, tools, education, and achievements unless they already appear in the original resume. You may reorder, clarify, and rewrite wording, but unsupported requirements must be listed as gaps. Return only valid JSON with keys: refinedResume (string), signals (string[]), gaps (string[]), plan (string[]).`,
    prompt: `Original resume:\n${resumeText}\n\nJob description:\n${jobText}\n\nRequirements analyst brief:\n${JSON.stringify(analyst)}`
  });
  const formattingReview = await callAiBot({
    system: `You are the Resume Formatting Review Bot. Check the edited resume against the analyst's formatting expectations and professional resume standards: hierarchy, headings, bullets, consistency, scanability, length, and ATS-friendly plain text. Do not add candidate facts. Return only valid JSON with keys: passed (boolean), summary (string), checks (string[]), formattedResume (string). formattedResume must contain the same factual content with formatting fixes only.`,
    prompt: `Original resume:\n${resumeText}\n\nEdited resume:\n${editor.refinedResume}\n\nRequirements analyst brief:\n${JSON.stringify(analyst)}`
  });
  const variationsReview = await callAiBot({
    system: `You are the Resume Variations and Selection Bot. Using the formatted primary resume and the analyst brief, create at least two genuinely different variations of the same resume: one optimized for impact and one optimized for ATS/skills scanning. Never invent facts. Compare the formatted primary and both variations, then select the strongest version as selectedResume. The selected version must already reflect the analyst brief and formatting review. Return only valid JSON with keys: variations (array of objects with id, name, resume, reason), selectedResume (string), selectedVariation (string), selectionReason (string). Include at least two variation objects; do not omit the primary from your comparison.`,
    prompt: `Original resume:\n${resumeText}\n\nFormatted primary resume:\n${formattingReview.formattedResume || editor.refinedResume}\n\nRequirements analyst brief:\n${JSON.stringify(analyst)}\n\nFormatting review:\n${JSON.stringify(formattingReview)}`
  });

  const requirements = cleanStringArray(analyst.requirements).length ? cleanStringArray(analyst.requirements) : extractRequirementsForAi(jobText);
  const keyPoints = cleanStringArray(analyst.keyPoints).length ? cleanStringArray(analyst.keyPoints) : requirements;
  const missingKeywords = requirements.filter((requirement) => !resumeText.toLowerCase().includes(requirement.toLowerCase())).slice(0, 8);
  const variations = Array.isArray(variationsReview.variations) ? variationsReview.variations.map((variation) => ({
    id: String(variation.id || 'variation'),
    name: String(variation.name || 'Resume variation'),
    resume: String(variation.resume || '').trim(),
    reason: String(variation.reason || 'Alternative positioning of the same verified experience.')
  })).filter((variation) => variation.resume).slice(0, 4) : [];
  const selectedResume = String(variationsReview.selectedResume || formattingReview.formattedResume || editor.refinedResume).trim();
  const formatting = {
    passed: Boolean(formattingReview.passed),
    summary: String(formattingReview.summary || 'Formatting review completed.'),
    checks: cleanStringArray(formattingReview.checks)
  };

  return {
    score: Math.max(35, Math.min(94, 70 + (formatting.passed ? 10 : 0))),
    signals: cleanStringArray(editor.signals),
    gaps: cleanStringArray(editor.gaps),
    plan: cleanStringArray(editor.plan),
    refinedResume: selectedResume,
    reviewer: formatting,
    keyPoints,
    formattingReview: formatting,
    variations,
    selectedVariation: String(variationsReview.selectedVariation || 'primary'),
    requirements,
    missingKeywords,
    matchedKeywords: [],
    bots: [
      { name: 'Requirements Analyst Bot', status: 'complete', detail: `Extracted the role's key points from the ${sourceType === 'link' ? 'job description link' : 'job description text'}.` },
      { name: 'Resume Editor Bot', status: 'complete', detail: `Tailored ${resumeName} with the configured AI provider while preserving candidate facts.` },
      { name: 'Formatting Review Bot', status: formatting.passed ? 'complete' : 'needs review', detail: formatting.summary },
      { name: 'Resume Variations Bot', status: variations.length >= 2 ? 'complete' : 'needs review', detail: String(variationsReview.selectionReason || 'Generated alternate versions and selected the strongest reviewed resume.') }
    ],
    aiProvider: aiProviderName()
  };
}

function extractRequirementsForAi(jobText) {
  return normalizeText(jobText)
    .split(/\n|\.|;|•|-/)
    .map((line) => line.trim())
    .filter((line) => line.length > 3 && line.length < 150)
    .filter((line) => /require|experience|skill|responsib|preferred|proficient|knowledge|javascript|typescript|react|node|python|sql|cloud|api/i.test(line))
    .slice(0, 12);
}

function cleanStringArray(value) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, 8) : [];
}

function aiProviderName() {
  if (process.env.MISTRAL_API_KEY) return 'Mistral';
  if (process.env.GROQ_API_KEY) return 'Groq';
  return 'OpenAI-compatible provider';
}

async function callAiBot({ system, prompt }) {
  const provider = process.env.MISTRAL_API_KEY
    ? { url: 'https://api.mistral.ai/v1/chat/completions', key: process.env.MISTRAL_API_KEY, model: process.env.MISTRAL_MODEL || 'mistral-small-latest' }
    : process.env.GROQ_API_KEY
      ? { url: 'https://api.groq.com/openai/v1/chat/completions', key: process.env.GROQ_API_KEY, model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile' }
      : { url: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions', key: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-4o-mini' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const result = await fetch(provider.url, {
      method: 'POST',
      headers: { authorization: `Bearer ${provider.key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: provider.model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }]
      }),
      signal: controller.signal
    });
    if (!result.ok) throw httpError(502, `AI provider returned HTTP ${result.status}.`);
    const payload = await result.json();
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw httpError(502, 'AI provider returned an empty response.');
    try {
      return JSON.parse(content);
    } catch {
      throw httpError(502, 'AI provider returned invalid JSON.');
    }
  } catch (error) {
    if (error.name === 'AbortError') throw httpError(504, 'AI provider request timed out.');
    throw error.statusCode ? error : httpError(502, 'Could not complete the AI refinement workflow.');
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > maxBodySize) {
      throw httpError(413, 'Request payload is too large.');
    }
  }

  try {
    return JSON.parse(body || '{}');
  } catch {
    throw httpError(400, 'Invalid JSON payload.');
  }
}

async function fetchJobDescription(jobUrl) {
  const url = validatePublicUrl(jobUrl);
  await assertPublicHostname(url.hostname);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);

  try {
    const fetched = await fetch(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.2',
        'user-agent': 'ResumeRefinerBot/1.0'
      },
      redirect: 'follow',
      signal: controller.signal
    });

    if (!fetched.ok) {
      throw httpError(502, `Job page returned HTTP ${fetched.status}.`);
    }

    const finalUrl = new URL(fetched.url || url.toString());
    if (finalUrl.hostname !== url.hostname) {
      await assertPublicHostname(finalUrl.hostname);
    }

    const contentType = fetched.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml')) {
      throw httpError(415, 'Job URL must return an HTML or text page.');
    }

    const text = await readLimitedResponse(fetched);
    return {
      text: cleanPageText(text),
      url: finalUrl.toString()
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw httpError(504, 'Job page fetch timed out.');
    }
    throw error.statusCode ? error : httpError(502, 'Could not fetch the job page.');
  } finally {
    clearTimeout(timeout);
  }
}

function validatePublicUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw httpError(400, 'Enter a valid job description URL.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw httpError(400, 'Only HTTP and HTTPS job links are allowed.');
  }

  if (url.username || url.password) {
    throw httpError(400, 'Job links with embedded credentials are not allowed.');
  }

  return url;
}

async function assertPublicHostname(hostname) {
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length) {
    throw httpError(400, 'Could not resolve the job link hostname.');
  }

  const blocked = records.some((record) => isPrivateIp(record.address));
  if (blocked) {
    throw httpError(400, 'Private or local network job links are not allowed.');
  }
}

function isPrivateIp(address) {
  if (net.isIP(address) === 6) {
    return (
      address === '::1' ||
      address.toLowerCase().startsWith('fc') ||
      address.toLowerCase().startsWith('fd') ||
      address.toLowerCase().startsWith('fe80:')
    );
  }

  const parts = address.split('.').map(Number);
  if (parts.length !== 4) return true;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0
  );
}

async function readLimitedResponse(fetched) {
  const reader = fetched.body?.getReader();
  if (!reader) {
    return fetched.text();
  }

  const chunks = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    if (received > maxFetchedBytes) {
      throw httpError(413, 'Job page is too large to process.');
    }
    chunks.push(value);
  }

  return new TextDecoder().decode(Buffer.concat(chunks));
}

function cleanPageText(page) {
  return normalizeText(
    page
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<[^>]+>/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
  ).slice(0, 20_000);
}

function setSecurityHeaders(response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'no-store');
}

function httpError(statusCode, publicMessage) {
  const error = new Error(publicMessage);
  error.statusCode = statusCode;
  error.publicMessage = publicMessage;
  return error;
}
