# Kickoff Football Challenge Tracker

A small, responsive football challenge tracker. It keeps entries in the browser with `localStorage` and supports JSON export/import for backup or transfer between devices.

## Run locally

1. Install Node.js.
2. Run `npm install`.
3. Run `npm run start` and open the local URL shown in the terminal.

## Build for hosting

Run `npm run build`. The static site is generated in `dist/`.

### GitHub Pages

A GitHub Actions workflow builds and deploys the site from the `main` branch. Vite automatically uses the repository Pages URL path, so no manual base-path changes are needed.

1. Create a GitHub repository (for example, `football-tracker`) and push this project to its `main` branch.
2. In the repository, open **Settings > Pages** and set **Build and deployment > Source** to **GitHub Actions**.
3. The **Deploy to GitHub Pages** workflow runs on push. When it finishes, open the site URL shown under **Settings > Pages** or in the workflow deployment environment.

Do not commit `node_modules` or `dist`; they are generated or installed by the workflow.

### Vercel

Vercel can deploy the project directly from its Git integration. Use `npm run build` as the build command and `dist` as the output directory; the default Vite setup is detected automatically.

## Data and privacy

Entries and settings are saved only in the current browser's local storage. They do not sync to another browser/device and can be removed if browser storage is cleared. Export the JSON backup regularly if the records matter. This version has no user accounts or server-side database.

## Tracker rules

- Select a common football market when adding an entry, or add a custom market; custom market names are saved locally and included in JSON backups.
- A single bet entry can include multiple fixtures, with a home team, away team, and market per fixture. Choose a country and league to get club suggestions, or type a club name manually. The bundled team lists are from [Openfootball](https://github.com/openfootball/football.json) (CC0) and currently cover Austria, Belgium, England, France, Germany, Greece, Italy, the Netherlands, Portugal, Scotland, Spain, and Turkey. Each league shows its roster season. This is an offline snapshot, not a live feed; some second divisions are listed for 2025-26, so verify the teams and odds before recording a bet. Combined odds and stake are entered once for the whole slip.

- A winning net profit is stake × (verified decimal odds − 1). The configured savings share is deducted, and the remaining balance rolls forward.
- A loss deducts the stake and stops later challenge rounds.
- A void has no profit/loss impact and is excluded from rollover calculations.
- Pending and NO BET do not affect bankroll.
- The all-wins scenario is explicitly hypothetical and uses the illustrative odds setting.
- Odds should be verified before each bet. NO BET is allowed. The tracker is for recordkeeping, not predictions.
