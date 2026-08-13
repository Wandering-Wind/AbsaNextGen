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
2. Open the repository's **Settings > Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open **Actions** and wait for **Deploy to GitHub Pages** to complete.

The published URL will be:

```text
https://wandering-wind.github.io/AbsaNextGen/
```

After committing, deploy from the command line with:

```bash
git push origin main
```
