import { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  BookOpenText,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ClipboardList,
  Code2,
  Download,
  FileText,
  Globe2,
  Link,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { buildRefinement, formatBytes, isPdfFile } from './refinement.js';
import { downloadResumeDocx, downloadResumePdf } from './exporters.js';
import './styles.css';

const tabs = [
  { id: 'link', label: 'Job link', icon: Link },
  { id: 'text', label: 'Paste JD', icon: ClipboardList },
  { id: 'api', label: 'API', icon: Code2 }
];

const providers = [
  {
    name: 'Ollama Local',
    model: 'mistral / llama3.1 / qwen',
    price: 'Free local',
    note: 'Best for private CV processing.'
  },
  {
    name: 'Mistral',
    model: 'Mistral Small / Medium',
    price: 'Free mode available',
    note: 'Strong hosted prototype default.'
  },
  {
    name: 'Groq',
    model: 'Llama / GPT-OSS',
    price: 'Developer tier',
    note: 'Fast hosted analysis and rewrites.'
  },
  {
    name: 'Hugging Face',
    model: 'Inference Providers',
    price: 'Free tier available',
    note: 'Flexible model marketplace.'
  }
];

const defaultResume = `JORDAN AMANI
Product-minded Software Engineer

SUMMARY
Full-stack engineer with experience building React interfaces, Node.js APIs, and cloud-backed workflow tools. Strong in cross-functional collaboration, rapid prototyping, and translating ambiguous requirements into maintainable products.

EXPERIENCE
Software Engineer - NovaWorks
- Built internal dashboards with React, TypeScript, and REST APIs.
- Improved onboarding workflows by automating manual review steps.
- Collaborated with product and design teams to ship user-facing features.

PROJECTS
Resume Analyzer
- Created a prototype that compares resumes against role requirements and identifies missing keywords.

SKILLS
React, TypeScript, Node.js, PostgreSQL, REST APIs, Git, Agile delivery`;

function App() {
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState(defaultResume);
  const [activeTab, setActiveTab] = useState('link');
  const [jobLink, setJobLink] = useState('');
  const [jobText, setJobText] = useState('');
  const [apiUrl, setApiUrl] = useState('https://api.greenhouse.io/v1/boards/company/jobs/123');
  const [apiMethod, setApiMethod] = useState('GET');
  const [apiBody, setApiBody] = useState('{\n  "role": "AI Product Engineer",\n  "company": "Example Labs"\n}');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const fileInputRef = useRef(null);

  const jobSignal = useMemo(() => {
    if (activeTab === 'link') return jobLink;
    if (activeTab === 'text') return jobText;
    return `${apiMethod} ${apiUrl} ${apiBody}`;
  }, [activeTab, apiBody, apiMethod, apiUrl, jobLink, jobText]);

  const canAnalyze = resumeFile && resumeText.trim().length > 80 && jobSignal.trim().length > 12 && !isRunning;

  const handleFile = async (file) => {
    setError('');
    setUploadStatus('');
    if (!file) return;
    if (!isPdfFile(file)) {
      setResumeFile(null);
      setError('Only PDF resume files are accepted.');
      return;
    }
    setResumeFile(file);
    setUploadStatus('Extracting text from PDF...');
    try {
      const { extractPdfText } = await import('./pdf.js');
      const extractedText = await extractPdfText(file);
      if (extractedText.length < 80) {
        setError('The PDF was uploaded, but very little text could be extracted. You can paste or correct the resume text below.');
      } else {
        setResumeText(extractedText);
      }
      setUploadStatus(`${formatBytes(file.size)} ready`);
    } catch {
      setUploadStatus(`${formatBytes(file.size)} uploaded`);
      setError('The PDF was uploaded, but text extraction failed. Paste the resume text below before refining.');
    }
  };

  const runAnalysis = async () => {
    if (!canAnalyze) return;
    setIsRunning(true);
    setResult(null);
    setJobDescription('');

    try {
      if (activeTab === 'link' || activeTab === 'text') {
        const response = await fetch('/api/refine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resumeName: resumeFile.name,
            resumeText,
            jobUrl: activeTab === 'link' ? jobLink : '',
            jobText: activeTab === 'text' ? jobText : ''
          })
        });
        const data = await readApiResponse(response);
        if (!response.ok) {
          throw new Error(data.error || 'Unable to refine the resume.');
        }
        setResult(data);
        setJobDescription(data.jobDescription || '');
      } else {
        setResult(buildRefinement({
          sourceType: activeTab,
          resumeName: resumeFile.name,
          jobSignal,
          resumeText
        }));
      }
    } catch (runError) {
      setError(runError.message);
    } finally {
      setIsRunning(false);
    }
  };

  async function readApiResponse(response) {
    const body = await response.text();
    if (!body.trim()) {
      throw new Error(`The refinement API returned an empty response (HTTP ${response.status}). Start the Vercel API locally with \`vercel dev\`, or check the deployment logs.`);
    }

    try {
      return JSON.parse(body);
    } catch {
      throw new Error(`The refinement API returned an invalid response (HTTP ${response.status}). Start the Vercel API locally with \`vercel dev\`, or check the deployment logs.`);
    }
  }

  const resetFlow = () => {
    setResult(null);
    setJobDescription('');
    setError('');
  };

  const downloadMarkdown = (text = result?.refinedResume, filename = 'refined-resume.md') => {
    if (!text) return;
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadPdf = async (text = result?.refinedResume, filename = 'refined-resume') => {
    if (!text) return;
    downloadResumePdf(text, filename);
  };

  const downloadDocx = async (text = result?.refinedResume, filename = 'refined-resume') => {
    if (!text) return;
    await downloadResumeDocx(text, filename);
  };

  return (
    <main className="shell">
      <section className="topbar" aria-label="Application header">
        <div>
          <p className="eyebrow">AI Resume Refinement Workspace</p>
          <h1>Resume Refiner</h1>
        </div>
        <div className="status-pill">
          <ShieldCheck size={16} />
          Truth-preserving rewrite
        </div>
      </section>

      <section className="workspace">
        <aside className="panel upload-panel">
          <div className="panel-heading">
            <FileText size={20} />
            <div>
              <h2>Resume</h2>
              <p>Upload a PDF CV, then keep the extracted text honest.</p>
            </div>
          </div>

          <button
            className={`dropzone ${isDragging ? 'dragging' : ''}`}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              handleFile(event.dataTransfer.files?.[0]);
            }}
          >
            <UploadCloud size={34} />
            <span>{resumeFile ? resumeFile.name : 'Drop PDF resume here'}</span>
            <small>{resumeFile ? uploadStatus || `${formatBytes(resumeFile.size)} ready` : 'or click to select from desktop'}</small>
          </button>
          <input
            ref={fileInputRef}
            className="hidden-input"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
            }}
          />
          {error && (
            <div className="error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <label className="field-label" htmlFor="resume-text">Extracted resume text</label>
          <textarea
            id="resume-text"
            className="resume-textarea"
            value={resumeText}
            onChange={(event) => setResumeText(event.target.value)}
          />
        </aside>

        <section className="panel job-panel">
          <div className="panel-heading">
            <BriefcaseBusiness size={20} />
            <div>
              <h2>Job Source</h2>
              <p>Use a public role link, pasted description, or a developer API feed.</p>
            </div>
          </div>

          <div className="tabbar" role="tablist" aria-label="Job source modes">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={activeTab === tab.id ? 'tab active' : 'tab'}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    resetFlow();
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'link' && (
            <div className="source-box">
              <label className="field-label" htmlFor="job-link">Job specification link</label>
              <div className="input-row">
                <Globe2 size={18} />
                <input
                  id="job-link"
                  value={jobLink}
                  placeholder="https://company.com/careers/senior-product-engineer"
                  onChange={(event) => setJobLink(event.target.value)}
                />
              </div>
              <p className="hint">The Vercel API fetches the page, strips noise, blocks private network URLs, then sends it through the editor and reviewer bots.</p>
            </div>
          )}

          {activeTab === 'text' && (
            <div className="source-box">
              <label className="field-label" htmlFor="job-text">Pasted job description</label>
              <textarea
                id="job-text"
                className="job-textarea"
                value={jobText}
                placeholder="Paste the full job description, requirements, company notes, and preferred qualifications..."
                onChange={(event) => setJobText(event.target.value)}
              />
            </div>
          )}

          {activeTab === 'api' && (
            <div className="source-box api-grid">
              <label className="field-label" htmlFor="api-method">Method</label>
              <div className="select-wrap">
                <select id="api-method" value={apiMethod} onChange={(event) => setApiMethod(event.target.value)}>
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                </select>
                <ChevronDown size={16} />
              </div>

              <label className="field-label" htmlFor="api-url">Endpoint</label>
              <div className="input-row">
                <Code2 size={18} />
                <input id="api-url" value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} />
              </div>

              <label className="field-label" htmlFor="api-body">JSON body or sample response</label>
              <textarea id="api-body" className="api-textarea" value={apiBody} onChange={(event) => setApiBody(event.target.value)} />
            </div>
          )}

          <div className="provider-grid">
            {providers.map((provider) => (
              <article className="provider-card" key={provider.name}>
                <div>
                  <strong>{provider.name}</strong>
                  <span>{provider.model}</span>
                </div>
                <small>{provider.price}</small>
                <p>{provider.note}</p>
              </article>
            ))}
          </div>

          <button className="primary-action" type="button" disabled={!canAnalyze} onClick={runAnalysis}>
            {isRunning ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            {isRunning ? 'Analyzing fit' : 'Refine resume'}
            {!isRunning && <ArrowRight size={18} />}
          </button>
        </section>

        <aside className="panel insight-panel">
          <div className="panel-heading">
            <Search size={20} />
            <div>
              <h2>Analysis</h2>
              <p>Role fit, gaps, rewrite plan, and refined output.</p>
            </div>
          </div>

          {!result && !isRunning && (
            <div className="empty-state">
              <BookOpenText size={38} />
              <h3>Ready for a tailored pass</h3>
              <p>Upload a PDF and provide a job source to generate a refinement plan.</p>
            </div>
          )}

          {isRunning && (
            <div className="progress-state">
              <Loader2 className="spin" size={34} />
              <h3>Reading the role deeply</h3>
              <p>Fetching the job source, editing the resume, and passing the draft through the reviewer bot.</p>
            </div>
          )}

          {result && (
            <div className="result-stack">
              <div className="score-card">
                <div>
                  <span>Match score</span>
                  <strong>{result.score}%</strong>
                </div>
                <div className="score-track">
                  <span style={{ width: `${result.score}%` }} />
                </div>
              </div>

              <p className="hint">{result.aiProvider ? `${result.aiProvider} editor and reviewer completed this pass.` : 'Local editor and reviewer completed this pass.'}</p>
              {result.rateLimitNotice && <div className="error"><AlertCircle size={16} />{result.rateLimitNotice}</div>}

              <InsightList title="Requirements key points" icon={ClipboardList} items={result.keyPoints || result.requirements || []} />
              <InsightList title="Hiring signals" icon={BadgeCheck} items={result.signals} />
              <InsightList title="Missing or weak areas" icon={AlertCircle} items={result.gaps} warning />
              <InsightList title="Rewrite plan" icon={RefreshCw} items={result.plan} />
              <InsightList title="Formatting review" icon={ShieldCheck} items={result.formattingReview?.checks || result.reviewer?.checks || []} />

              {result.bots && (
                <div className="bot-timeline">
                  {result.bots.map((bot) => (
                    <div key={bot.name}>
                      <Check size={16} />
                      <span>
                        <strong>{bot.name}</strong>
                        <small>{bot.detail}</small>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {jobDescription && (
                <details className="job-extract">
                  <summary>Extracted job description</summary>
                  <p>{jobDescription}</p>
                </details>
              )}

              <div className="resume-preview">
                <div className="preview-head">
                  <h3>Reviewed primary resume</h3>
                  <div className="download-actions">
                    <button type="button" onClick={() => void downloadPdf()}>
                      <Download size={16} />
                      PDF
                    </button>
                    <button type="button" onClick={() => void downloadDocx()}>
                      <Download size={16} />
                      DOCX
                    </button>
                    <button type="button" onClick={downloadMarkdown}>
                      <Download size={16} />
                      MD
                    </button>
                  </div>
                </div>
                <pre>{result.refinedResume}</pre>
              </div>

              {result.variations?.length >= 2 && (
                <details className="job-extract">
                  <summary>Other resume variations</summary>
                  {result.variations.filter((variation) => variation.id !== 'primary').map((variation) => (
                    <article className="variation-preview" key={variation.id}>
                      <div className="preview-head">
                        <div>
                          <h3>{variation.name}</h3>
                          <p className="hint">{variation.reason}</p>
                        </div>
                        <div className="download-actions">
                          <button type="button" onClick={() => void downloadPdf(variation.resume, variation.id)}>
                            <Download size={16} />
                            PDF
                          </button>
                          <button type="button" onClick={() => void downloadDocx(variation.resume, variation.id)}>
                            <Download size={16} />
                            DOCX
                          </button>
                        </div>
                      </div>
                      <pre>{variation.resume}</pre>
                    </article>
                  ))}
                </details>
              )}
            </div>
          )}
        </aside>
      </section>

      <section className="architecture-strip" aria-label="Architecture summary">
        <div><LockKeyhole size={18} /><span>PDF validation</span></div>
        <div><Globe2 size={18} /><span>Job and company ingestion</span></div>
        <div><Sparkles size={18} /><span>Provider-agnostic AI orchestration</span></div>
        <div><Check size={18} /><span>No fabricated achievements</span></div>
      </section>
    </main>
  );
}

function InsightList({ title, icon: Icon, items, warning = false }) {
  return (
    <section className={warning ? 'insight warning' : 'insight'}>
      <h3><Icon size={17} />{title}</h3>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
