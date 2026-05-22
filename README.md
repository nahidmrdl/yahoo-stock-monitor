# Yahoo Stock Monitor

A small Windows-friendly Electron stock monitor with a dashboard for managing tickers and persistent desktop ticker widgets.

## Run

```bash
npm install
npm start
```

## Features

- Add/remove tickers
- Auto-refresh quotes on the dashboard while the dashboard is open
- Mini charts from Yahoo Finance public chart endpoint
- Dashboard ranges: 1D, 5D, 1M, 6M, 1Y, All
- Saved watchlist in local storage
- Create up to 15 desktop widgets
- Widget positions, sizes, chart ranges, and symbols are saved
- Widget ranges: 1D, 1W, 1M, 6M, 1Y, All
- Hoverable widget charts
- Right-click a widget to open the dashboard, close that widget, or toggle always-on-top for that widget
- Start with Windows support so saved widgets can return after restart
- Closing the dashboard exits the app; closing the last widget also exits the app

## Notes

This app uses Yahoo Finance public endpoints directly. It is free for personal use but unofficial, so Yahoo can change or rate-limit it at any time.

## Build

```bash
npm run dist
```

The project is configured with `electron-builder` for Windows release packaging.

## Windows Release Workflow

Use the `Windows Release` GitHub Actions workflow to create a release build.

The workflow asks for:

- `version`: the release version, such as `1.2.3` or `v1.2.3`
- `release_notes`: dot-separated release note sentences

It creates a GitHub release tagged as `v<version>` and uploads:

- `Yahoo-Stock-Monitor-Setup-<version>.exe`
- `Yahoo-Stock-Monitor-Uninstaller-<version>.exe`

The setup installer can install the app for new users or update an existing installation in place.
