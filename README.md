# Resume Refiner

An AI-powered resume tailoring workspace built with Vite, React, and a Vercel serverless API. Upload a PDF resume, provide a job description link, and the app extracts the resume text, fetches the job page, runs an editor bot, runs a reviewer bot, and produces a truth-preserving resume draft downloadable as PDF, DOCX, or Markdown.

![Resume Refiner UI](https://img.shields.io/badge/status-MVP-blue) ![Vite 7](https://img.shields.io/badge/vite-7-646CFF?logo=vite&logoColor=white) ![React 19](https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=white)

---

## Features

### Resume Upload & Validation
- Drag-and-drop or click-to-select PDF upload zone
- Client-side validation by MIME type (`application/pdf`) and file extension (`.pdf`)
- Browser-based PDF text extraction
- Real-time file size display with human-readable formatting (B / KB / MB)
- Editable extracted resume text area for reviewing and correcting parsed content

### Job Source Input (3 Modes)
| Mode | Description |
|------|-------------|
| **Job Link** | Paste a public career page URL — `/api/refine` fetches, cleans, and analyzes the page |
| **Paste JD** | Paste the full job description, requirements, and preferred qualifications directly |
| **API** | Configure a developer API feed (method, endpoint, JSON body) for programmatic job ingestion (e.g. Greenhouse, Lever) |

### AI Provider Awareness
The interface displays four supported AI provider options for the refinement engine:

| Provider | Models | Pricing |
|----------|--------|---------|
| Ollama Local | mistral / llama3.1 / qwen | Free (local) |
| Mistral | Mistral Small / Medium | Free mode available |
| Groq | Llama / GPT-OSS | Developer tier |
| Hugging Face | Inference Providers | Free tier available |

### Analysis & Refinement Output
- **Match score** — Percentage-based role fit indicator with animated progress bar
- **Hiring signals** — Key strengths detected from the resume that align with the job
- **Missing or weak areas** — Gaps flagged with actionable improvement notes (never fabricated)
- **Rewrite plan** — Step-by-step strategy for refining the resume truthfully
- **Four-agent workflow** — A requirements analyst extracts key points, an editor tailors the resume, a formatting reviewer checks ATS-friendly structure, and a variations agent creates and compares alternate versions
- **Reviewer checks** — Shows formatting checks and preserves the strongest reviewed version as the primary resume
- **Resume versions** — The reviewed primary resume plus at least two alternate versions are available for PDF and DOCX download
- **Production formatting** — Internal agent notes and metadata are removed, sections and bullets are normalized, and exports use professional hierarchy, spacing, typography, and ATS-safe plain text

### Truth-Preserving Philosophy
The core design principle is **no fabrication**. The refinement engine:
- Reframes existing experience only
- Flags missing requirements instead of inventing them
- Preserves employers, dates, tools, and achievements exactly unless the user confirms changes
- Prompts the user to add specific metrics, platforms, or achievements only if they are true

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Vite 7](https://vite.dev/) + [React 19](https://react.dev/) |
| Language | JavaScript (JSX) |
| Icons | [Lucide React](https://lucide.dev/) |
| PDF extraction | `pdfjs-dist` |
| Resume export | `docx` + `jspdf` |
| Serverless API | Vercel `/api/refine` |
| Styling | Vanilla CSS with custom design tokens |
| Linting | ESLint 9 with flat config + eslint-plugin-react |
| Testing | Node.js built-in test runner (`node --test`) |
| Deployment | Vercel (with `vercel.json` configuration) |

---

## Project Structure

```
Resume-Refiner/
├── index.html              # HTML entry point with #root mount
├── vite.config.js          # Vite config with React plugin
├── package.json            # Scripts, dependencies, metadata
├── api/
│   └── refine.js           # Secure job-link ingestion + bot workflow endpoint
├── vercel.json             # Vercel deployment config + security headers
├── eslint.config.js        # ESLint flat config for JS/JSX
├── .env.example            # Environment variable template (future backend)
├── .env.example            # Server-side AI environment variable template
├── src/
│   ├── main.jsx            # App component, UI layout, all React logic
│   ├── exporters.js        # PDF, DOCX, and Markdown download helpers
│   ├── pdf.js              # Browser PDF text extraction helper
│   ├── refinement.js       # Refinement engine, PDF validation, byte formatting
│   └── styles.css          # Full design system (responsive, light theme)
└── test/
    └── refinement.test.js  # Unit tests for refinement logic and utilities
```

---

## Local Development

```bash
# Install dependencies
npm ci

# Start the local app, including the /api/refine endpoint
npm run dev
```

The dev server runs at `http://localhost:5173` (or the next available port) with hot module replacement.
The Vite development server also mounts `/api/refine` locally, so job-link testing works with the same command. Configure the AI variables from `.env.example` in a local `.env` file when using the hosted AI workflow.

---

## Available Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite --host 0.0.0.0` | Start development server |
| `build` | `vite build` | Create production bundle in `dist/` |
| `preview` | `vite preview --host 0.0.0.0` | Preview the production build locally |
| `lint` | `eslint .` | Run ESLint checks |
| `test` | `node --test` | Run the Node.js test suite |
| `security:audit` | `npm audit --audit-level=high` | Check for high-severity vulnerabilities |
| `predeploy` | lint → test → audit → build | Full verification pipeline (used by Vercel) |

---

## Testing

```bash
npm test
```

The test suite covers:
- **PDF validation** — Accepts `.pdf` files by MIME type or extension, rejects `.docx` and null inputs
- **Byte formatting** — Verifies human-readable file size output (`0 KB`, `512 B`, `2.0 KB`)
- **Refinement engine** — Validates scoring, signal detection, gap analysis, and truth-preservation for AI/API-heavy job descriptions
- **Four-agent workflow** — Confirms requirements key points, edited output, formatting review, and alternate resume versions are produced

---

## Vercel Deployment

### Quick Deploy

Connect the repository to [Vercel](https://vercel.com) or deploy manually:

```bash
vercel --prod
```

### Configuration

The `vercel.json` is pre-configured with:

| Setting | Value |
|---------|-------|
| Framework | `vite` |
| Install command | `npm ci` |
| Build command | `npm run predeploy` (runs lint, tests, audit, then build) |
| Output directory | `dist` |

The deployment also includes `/api/refine`, a Vercel serverless function that:

- accepts resume text and a job URL or pasted job text
- rejects non-HTTP protocols and URLs with embedded credentials
- blocks localhost and private network addresses
- applies a fetch timeout and page-size limit
- removes scripts, styles, navigation, footer HTML, and tags before analysis
- runs the requirements analyst, resume editor, formatting reviewer, and variations/selection agents in sequence when an AI provider is configured
- returns the selected primary resume, alternate versions, formatting checks, key points, bot timeline, extracted requirements, and job-description excerpt

### Security Headers

All responses include production security headers:

| Header | Value |
|--------|-------|
| Content-Security-Policy | `default-src 'self'`; scripts, styles, fonts from `'self'`; images from `'self' data: blob:`; no `object-src`; `frame-ancestors 'none'` |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Cross-Origin-Opener-Policy | `same-origin` |
| Permissions-Policy | camera, microphone, geolocation, payment, usb all disabled |
| Cache-Control (assets) | `public, max-age=31536000, immutable` |

### Environment Variables

Without an AI key, the app uses its deterministic truth-preserving editor and reviewer so local development still works. To enable the two-pass hosted AI workflow, configure one of these server-side variables on Vercel:

The following keys can be configured as **server-side environment variables** on Vercel (never prefixed with `VITE_`):

| Variable | Purpose |
|----------|---------|
| `AI_PROVIDER` | Select `mistral`, `groq`, or `openai` when multiple provider keys are configured |
| `MISTRAL_API_KEY` | Mistral AI provider authentication |
| `GROQ_API_KEY` | Groq AI provider authentication |
| `HUGGINGFACE_API_KEY` | Hugging Face Inference API authentication |
| `OPENAI_API_KEY` | OpenAI-compatible provider authentication |
| `OPENAI_BASE_URL` | Optional OpenAI-compatible chat completions URL |
| `OPENAI_MODEL` | Optional OpenAI-compatible model name |
| `MISTRAL_MODEL` | Optional Mistral model name |
| `GROQ_MODEL` | Optional Groq model name |

When configured, the server runs the Requirements Analyst, Resume Editor, Formatting Review, and Resume Variations agents in sequence. Provider rate limits are retried briefly; if the provider remains unavailable, the app returns a polished local fallback instead of failing the request. API keys are never sent to the browser.

---

## Security Notes

- PDF files are validated client-side by MIME type and extension before extraction
- Job links are fetched server-side with protocol validation, DNS checks, private-network blocking, timeout protection, and size limits
- No API keys are bundled into client code
- AI provider keys live only in the server-side API function and are never bundled into client code
- The AI rewrite flow is designed to preserve truth and flag missing requirements instead of fabricating experience

---

## License

This project is private and not currently licensed for redistribution.
