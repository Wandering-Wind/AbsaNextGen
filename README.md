# Absa NextGen case study

A React and Vite case-study prototype, configured for deployment to GitHub Pages.

## Run locally

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds and deploys every push to `main`.

1. Push this configuration to GitHub.
2. Open **Actions** and wait for **Deploy to GitHub Pages** to complete.

The workflow enables GitHub Pages automatically. If repository policy prevents
automatic enablement, open **Settings > Pages** and set **Source** to
**GitHub Actions**, then re-run the workflow.

The published URL will be:

```text
https://wandering-wind.github.io/AbsaNextGen/
```

After committing, deploy from the command line with:

```bash
git push origin main
```
