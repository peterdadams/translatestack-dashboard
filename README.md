# TranslateStack

A static comparison dashboard for developers evaluating self-hosted translation (LibreTranslate, Lingva, Ollama + Llama 3) against commercial translation APIs (Google Cloud Translation, DeepL, Azure AI Translator).

Includes a feature matrix, latency and accuracy benchmarks, hosting cost tiers, and an interactive break-even calculator. Pure static HTML/CSS/JS — no build step, no backend, no server-side code. All data is baked in at research time; the calculator runs entirely client-side.

## Files

```
index.html   – markup for every section
base.css     – reset / base styles
style.css    – design tokens + component styles (light + dark theme)
data.js      – researched pricing, latency, accuracy, and cost-model data (with source URLs)
app.js       – theme toggle, Chart.js rendering, calculator logic
```

## Local preview

Any static file server works, e.g.:

```bash
npx serve .
```

Then open the printed local URL.

## Deploy to Cloudflare Pages

**Option A — via the Cloudflare dashboard (no CLI needed)**

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git**.
3. Select this repository.
4. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave blank)*
   - **Build output directory:** `/` (repo root)
5. Click **Save and Deploy**. Cloudflare will give you a `*.pages.dev` URL, and every future push to the connected branch auto-deploys.

**Option B — via Wrangler CLI**

```bash
npm install -g wrangler
wrangler login
wrangler pages deploy . --project-name=translatestack
```

`wrangler pages deploy` uploads the current directory as-is (static files, no build step needed) and prints the live `*.pages.dev` URL. Re-run the same command after future edits to redeploy.

## Deploy to Cloudflare Workers (alternative to Pages)

Pages is the simpler fit for a static site like this one, but if you'd rather serve it from a Worker (e.g. to add edge logic later, like A/B tests or auth), use [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/):

1. Install Wrangler and log in (see above).
2. Add a `wrangler.toml` in the repo root:

   ```toml
   name = "translatestack"
   compatibility_date = "2026-01-01"

   [assets]
   directory = "."
   ```

3. Deploy:

   ```bash
   wrangler deploy
   ```

Wrangler uploads every file in the directory as a static asset and serves `index.html` at the root — no Worker script is required for a purely static site like this one.

## Sources

Every pricing, latency, and accuracy figure in the dashboard links to its source inline in the page footer (`#sources` section) and in the comments of `data.js`.
