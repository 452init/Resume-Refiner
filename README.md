# Resume Refiner

An AI-powered resume tailoring workspace built with Vite and React. Upload a PDF resume, provide a job source, and receive a truth-preserving refinement — complete with match scoring, gap analysis, a rewrite plan, and downloadable Markdown output.

![Resume Refiner UI](https://img.shields.io/badge/status-MVP-blue) ![Vite 7](https://img.shields.io/badge/vite-7-646CFF?logo=vite&logoColor=white) ![React 19](https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=white)

---

## Features

### Resume Upload & Validation
- Drag-and-drop or click-to-select PDF upload zone
- Client-side validation by MIME type (`application/pdf`) and file extension (`.pdf`)
- Real-time file size display with human-readable formatting (B / KB / MB)
- Editable extracted resume text area for reviewing and correcting parsed content

### Job Source Input (3 Modes)
| Mode | Description |
|------|-------------|
| **Job Link** | Paste a public career page URL — the production service will crawl the job page, company site, and culture pages |
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
- **Refined resume draft** — Full rewritten resume available as a scrollable preview and downloadable `.md` file

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
├── vercel.json             # Vercel deployment config + security headers
├── eslint.config.js        # ESLint flat config for JS/JSX
├── .env.example            # Environment variable template (future backend)
├── src/
│   ├── main.jsx            # App component, UI layout, all React logic
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

# Start the dev server (accessible on LAN)
npm run dev
```

The dev server runs at `http://localhost:5173` (or the next available port) with hot module replacement.

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

This is currently a **frontend-only MVP** — no environment variables are required for deployment.

When a backend API layer is added, the following keys should be configured as **server-side environment variables** on Vercel (never prefixed with `VITE_`):

| Variable | Purpose |
|----------|---------|
| `MISTRAL_API_KEY` | Mistral AI provider authentication |
| `GROQ_API_KEY` | Groq AI provider authentication |
| `HUGGINGFACE_API_KEY` | Hugging Face Inference API authentication |

---

## Security Notes

- PDF files are validated client-side by MIME type and extension in this frontend MVP
- No API keys are bundled into client code
- Future AI provider keys should live only in server-side functions or backend services
- The AI rewrite flow is designed to preserve truth and flag missing requirements instead of fabricating experience

---

## License

This project is private and not currently licensed for redistribution.
