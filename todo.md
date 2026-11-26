# Manual follow-up

Items that need a product decision, supplied asset, or explicit device-level verification after the source restructure.

## Restore missing UI assets

- [ ] Choose and bundle a local icon set (or provide approved SVGs) for the existing `data-lucide` icons. The markup remains, but the CDN icon runtime was removed, so these icons currently render blank.
- [ ] Choose and bundle a local chart implementation, or approve a small custom canvas chart. The dashboard's building-score chart currently renders blank because Chart.js was removed and no local replacement is installed.
- [ ] Decide whether the Prompt font is required. The old Google Fonts request was removed for offline use; provide licensed font files if the system fallback is not acceptable.
- [ ] Supply a school logo/branding asset if the report's school name/logo should be prefilled. The report currently has a text input and no image asset is referenced in `src`.

## Confirm data and mobile behavior

- [ ] Confirm browser/device-local storage is acceptable for inspection and issue records. It does not sync between users or devices and browser storage can be cleared by the user or operating system.
- [ ] Decide whether existing Canva Sheet records need to be exported/imported. No migration path or export/import UI has been added.
- [ ] Choose a backup/export format and retention approach if records must survive device loss or app reinstall.
- [ ] When starting Capacitor packaging, confirm iOS/Android targets, app name, bundle identifier, and required permissions. No native project or app icons/splash assets exist yet.
- [ ] Verify data persistence and printing on actual target browsers/devices, including the intended Capacitor WebView. The local-storage adapter and print behavior have only been build-checked.

## Project finishing

- [ ] Review any remaining Canva-derived class names and inline presentation attributes, and remove them if they have no styling purpose.
- [ ] Review Thai text rendering and wording in the split files on the target environment.
