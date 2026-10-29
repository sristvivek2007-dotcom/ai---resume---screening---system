# AI Resume Screening & Job Matching — Netlify Version

This version is adapted for Netlify: static HTML/CSS/JavaScript frontend + a Netlify Function backend. It supports PDF and DOCX resumes, skill detection, TF-IDF-style text similarity scoring, ranked sample jobs, and CSV export.

## Publish on Netlify (easiest: GitHub)

1. Download and extract this ZIP.
2. Create a GitHub repository and upload **all files and folders**, including `public/`, `netlify/`, `netlify.toml`, and `package.json`.
3. Open https://app.netlify.com/ and sign in.
4. Choose **Add new site → Import an existing project**.
5. Connect GitHub and select the repository.
6. Netlify should detect the configuration from `netlify.toml`. Confirm:
   - Build command: leave blank (or `npm install` if the UI requires one)
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
7. Click **Deploy**. Wait for dependencies and functions to finish building.
8. Open the generated `*.netlify.app` URL and test with a text-based PDF and a DOCX file.

## Can I upload the ZIP directly?
Netlify's manual drag-and-drop deploy is designed for the built static output and does not reliably install/build the Node dependencies or deploy the function from a ZIP. Use GitHub import for this full-stack version. Drag-and-drop of only `public/` would publish the UI but the resume matching API would not work.

## Local development (recommended test)
Install Node.js 20+, then from this project directory run:

```bash
npm install
npx netlify-cli dev
```

Open the local URL printed by Netlify CLI. The function endpoint is `/.netlify/functions/match`.

## Included files
- `public/index.html` — responsive UI
- `public/styles.css` — styling
- `public/app.js` — upload request, results rendering, CSV export
- `netlify/functions/match.js` — PDF/DOCX extraction and job matching endpoint
- `netlify.toml` — Netlify build and function settings
- `package.json` — backend dependencies

## Important notes
- Upload limit is 4 MB for this demo.
- Scanned/image-only PDFs require OCR and will not produce extracted text.
- Sample job descriptions are hard-coded in the function.
- Scores measure text similarity, not the probability of getting hired.
- This prototype does not intentionally persist uploaded resumes. Avoid uploading real sensitive candidate information until you add consent, access controls, security testing, retention/deletion policies, and human review.
- Google Fonts is loaded from an external service; the page still works if that service is unavailable.
