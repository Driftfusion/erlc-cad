# ERLC CAD - Ready-to-run Vite + React starter

This is a frontend-only CAD prototype (no login) built with React, Tailwind CSS, React Router, and React DnD.
Data persists to `localStorage`. Designed for ERLC use.

## Quick start

1. Install Node.js **20.19+** or **22.12+** (required).
2. Extract the zip and open the project folder.
3. Install deps:
   ```
   npm install
   ```
4. Run dev server:
   ```
   npm run dev
   ```
5. Open the URL printed by Vite (usually http://localhost:5173).

## Build for production
```
npm run build
npm run preview
```

## Deploy
- Vercel: connect the repo and deploy.
- Netlify: connect repo or drag & drop build output.
- GitHub Pages: build static and push to `gh-pages` branch.

## Notes
- No real-time tracking is implemented.
- All data stored in browser localStorage.
