# Claude Code: deploy "Each Child a Seed"

You are deploying a **finished static website**. Do **not** change, rebuild, reformat, minify, rename or "improve" any file. Push the files exactly as they are.

## What this folder is
A static site with **no build step**. Every page opens directly in a browser.

| Path | What it is |
| --- | --- |
| `index.html` | Landing page with links to everything |
| `ECAS Sim 1 Grow a Seed.dc.html` | Student 3D simulation, E-journal and Resources |
| `ECAS Lesson Plan.dc.html` | Teacher lesson plan (A4, print-ready) |
| `ECAS Plant Journal.dc.html` | Printed journal (A5). Use `?plant=basil`, `kangkong` or `bayam` |
| `support.js` | Runtime that renders the `.dc.html` pages. **Required.** |
| `doc-page.js` | Print layout for the lesson plan and journal |
| `growseed-scene.js` | The 3D bench. Loads three.js from unpkg at runtime |
| `web/` | Plant photos |
| `_ds/` | Design system stylesheets |
| `vercel.json` | Short URLs: `/sim1`, `/lesson-plan`, `/journal` |
| `backend/` | Google Apps Script source and setup guide. **Not deployed** (excluded by `.vercelignore`) and kept in Git only. The live script is already deployed by the teacher. The app calls its `/exec` URL, which is set in the Sim 1 file. |

File names contain spaces. Keep them exactly as they are, because the pages link to each other by these names.

## Steps

### 1. Check the tools
```bash
git --version && gh --version && npx vercel --version
```
If `gh` is missing, ask the user to install GitHub CLI, or create the repo on github.com by hand. Log in if needed with `gh auth login` and `npx vercel login`. **Stop and ask the user** to complete any browser login.

### 2. Create the repo and push
Run these from inside this folder:
```bash
git init
git add -A
git commit -m "Each Child a Seed: ECAS P3 lesson package"
gh repo create each-child-a-seed --public --source=. --remote=origin --push
```
Use `--private` instead if the user asks. Vercel works with private repos too.

### 3. Deploy to Vercel
```bash
npx vercel --prod --yes
```
When asked:
- **Framework preset:** Other
- **Build command:** none (leave empty)
- **Output directory:** `.` (this folder)
- **Install command:** none

Optional, so that every `git push` redeploys automatically: in the Vercel dashboard, open the project → Settings → Git → **Connect** the `each-child-a-seed` repo.

### 4. Verify, then report back
Open each URL and confirm it loads, has no console errors, and the 3D bench appears in Sim 1:
- `https://<project>.vercel.app/`
- `https://<project>.vercel.app/sim1`
- `https://<project>.vercel.app/lesson-plan`
- `https://<project>.vercel.app/journal?plant=kangkong`

Then give the user:
1. The GitHub repo URL
2. The live Vercel URL
3. The short links above

## Rules
- Never edit `support.js`, `doc-page.js`, `growseed-scene.js`, the `.dc.html` files or anything in `_ds/`.
- Do not add a framework, bundler, `package.json` or build step.
- The Resources tab opens the lesson plan and journals **inside** the app (in a frame), so all three `.dc.html` pages must stay in the same folder.
- Do not commit secrets. The Apps Script Web App URL is not secret, but the **teacher PIN** must never be put in this repo.
- If a deploy fails, show the user the exact error. Don't try to work around it by changing site files.
