# Reminders

A minimal reminder app with three sections: **To-do**, **Awaiting Reply**, and **Completed**. It's a local-first PWA. Data is stored in this browser's localStorage, and the app can be installed and used offline.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit + component tests
npm run build      # type-check + production build (with service worker)
npm run preview    # serve the production build at http://localhost:4173
```

To install it as an app, open the production build (`npm run preview`, or any static host serving `dist/`) and use the browser's **Install** option.

## Features

- **Sections:** move items between To-do and Awaiting Reply with the hourglass button, `W`, or by dragging onto a tab. Check an item off to complete it. Uncheck it in Completed to send it back where it came from.
- **Details** (click an item): notes, due/follow-up date and time with quick presets behind a **Shortcuts** button (In 1 hour, This evening, Tomorrow, Next week), priority, repeat, and who you're waiting on.
- **Quick add:** in Awaiting Reply, `Quote for roof @Dana` records Dana as who you're waiting on.
- **Repeating items** stay in place with their next date when completed, and a copy is logged in Completed.
- **Undo** for complete, move, delete, clear, and import (toast button or `⌘Z`).
- **Search** across all sections. **Priority zones**: To-do and Awaiting Reply are split into !!! / !! / ! / None zones; fold any zone, or drag an item into another zone to change its priority. **Sort** within each zone manually (drag) or by due date.
- **Notifications** at due time, opt-in from the ⋯ menu. All-day items alert at 9:00. The overdue count shows in the tab title and the installed app's badge. Without a push server, alerts fire only while the app or tab is open (it can be in the background).
- **Backup:** export and import JSON (merge or replace). Changes sync live between open tabs.
- **Theme:** auto, light, or dark.

## Calendar

Click **Calendar** in the header (or press `C`) to switch views. The app remembers which view you last used.

- **Month grid:** To-do items show in blue and Awaiting Reply items in amber. Overdue items are red. On phones, items become dots.
- **Day agenda:** click a day to see and edit its items. On today, overdue items are listed first. The add field creates reminders on that day, and ending with `@name` makes it an Awaiting Reply item.
- **No date** tray: open items without a date.
- **Drag to reschedule:** drag an item onto a day to set its date (the time is kept). Drag it onto **No date** to clear the date. Each change can be undone.
- **Show:** the **To-do** and **Awaiting** toggles hide or show each section. Search filters the calendar too. The week can start on Monday or Sunday (⋯ menu).

## Keyboard

| Key | Action |
| --- | --- |
| `C` | Switch Reminders / Calendar |
| `N` | New reminder |
| `/` | Search |
| `1` `2` `3` | Switch section |
| `J` / `K` | Select next / previous |
| `Enter` | Open / close details |
| `X` | Complete / restore |
| `W` | Toggle Awaiting Reply |
| `⌥↑` / `⌥↓` | Reorder within a zone (manual sort) |
| `Delete` | Delete |
| `Esc` | Close / deselect |
| `?` | Show shortcuts |
| `←` `→` / `↑` `↓` | Calendar: previous/next day / week |
| `[` / `]` | Calendar: previous/next month |
| `T` | Calendar: today |

## Code map

- `src/store.ts`: state and actions (zustand, persisted to localStorage)
- `src/actions.ts`: user-facing actions that add undo toasts
- `src/lib/`: date helpers and repeat logic, sorting and grouping, calendar grid and agenda, backup validation
- `src/hooks/`: notifications, keyboard shortcuts, clock, cross-tab sync, document title and theme
- `src/components/`: UI
- `public/sw-notifications.js`: handles notification clicks in the service worker
