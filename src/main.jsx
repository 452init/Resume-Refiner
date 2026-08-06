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
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const jobSignal = useMemo(() => {
    if (activeTab === 'link') return jobLink;
    if (activeTab === 'text') return jobText;
    return `${apiMethod} ${apiUrl} ${apiBody}`;
  }, [activeTab, apiBody, apiMethod, apiUrl, jobLink, jobText]);

  const canAnalyze = resumeFile && jobSignal.trim().length > 12 && !isRunning;

  const handleFile = (file) => {
    setError('');
    if (!file) return;
    if (!isPdfFile(file)) {
      setResumeFile(null);
      setError('Only PDF resume files are accepted.');
      return;
    }
    setResumeFile(file);
  };

  const runAnalysis = () => {
    if (!canAnalyze) return;
    setIsRunning(true);
    setResult(null);
    window.setTimeout(() => {
      setResult(buildRefinement({
        sourceType: activeTab,
        resumeName: resumeFile.name,
        jobSignal,
        resumeText
      }));
      setIsRunning(false);
    }, 1400);
  };

  const resetFlow = () => {
    setResult(null);
    setError('');
  };

  const downloadMarkdown = () => {
    if (!result) return;
    const blob = new Blob([result.refinedResume], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'refined-resume.md';
    anchor.click();
    URL.revokeObjectURL(url);
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
            <small>{resumeFile ? `${formatBytes(resumeFile.size)} ready` : 'or click to select from desktop'}</small>
          </button>
          <input
            ref={fileInputRef}
            className="hidden-input"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => handleFile(event.target.files?.[0])}
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
              <p className="hint">The production service will crawl the job page, company site, culture pages, and relevant public hiring context.</p>
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
              <p>Extracting requirements, culture signals, keywords, and truthful resume improvements.</p>
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

              <InsightList title="Hiring signals" icon={BadgeCheck} items={result.signals} />
              <InsightList title="Missing or weak areas" icon={AlertCircle} items={result.gaps} warning />
              <InsightList title="Rewrite plan" icon={RefreshCw} items={result.plan} />

              <div className="resume-preview">
                <div className="preview-head">
                  <h3>Refined resume draft</h3>
                  <button type="button" onClick={downloadMarkdown}>
                    <Download size={16} />
                    Markdown
                  </button>
                </div>
                <pre>{result.refinedResume}</pre>
              </div>
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
