# CTC Clean Tracker

## Development

- `npm run dev` starts the Vite development server.
- `npm run build` creates the production web app in `dist/`.
- `npm run preview` serves the production build locally.

npm must be installed*

`winget install OpenJS.NodeJS` on Windows

## Zed Tasks

Zed task definitions are available in `.zed/tasks.json`:

- **Vite: dev** - runs `npm run dev`
- **Vite: dev (npm.cmd)** - runs `npm.cmd run dev` (Windows-friendly variant)
- **Vite: build** - runs `npm run build`
- **Vite: preview** - runs `npm run preview`

The app uses local browser storage and does not require a network connection for saved records. For a Capacitor wrapper, use `dist/` as the web asset directory and bundle all app assets with the native project.

View markup lives in `src/sections/`, shared structure in `src/index.html`, styles in `src/styles/`, and application startup/data integration in `src/main.js` and `src/app.js`.

