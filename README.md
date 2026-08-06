# Resume Refiner

A Vite + React application for tailoring a PDF resume against a job source. The current MVP includes PDF-only upload validation, job link/text/API input modes, a provider-aware refinement workflow, downloadable Markdown output, and deployment checks for Vercel.

## Local development

```bash
npm ci
npm run dev
```

## Verification

Run the same checks Vercel runs before deployment:

```bash
npm run predeploy
```

This executes:

- ESLint
- Node test suite
- `npm audit --audit-level=high`
- Vite production build

## Vercel deployment

The project includes `vercel.json` with:

- Vite framework configuration
- `npm ci` install command
- `npm run predeploy` build gate
- `dist` output directory
- security headers including CSP, frame blocking, content sniffing protection, referrer policy, and permissions policy

Connect this repository to Vercel or deploy with:

```bash
vercel --prod
```

## Security notes

- PDF files are validated client-side by MIME type and extension in this frontend MVP.
- No API keys are bundled into client code.
- Future AI provider keys should live only in server-side functions or backend services.
- The AI rewrite flow is designed to preserve truth and flag missing requirements instead of fabricating experience.
