# Sorry Kitty — modular layout

The original `sorry_kitty_v8.html` is split into small files. Behavior is
identical; nothing was rewritten — code was only relocated and given an
explicit load order.

```
public/sorry-kitty.html         ← thin shell: <head>, font, CSS, scripts
public/sorry-kitty/
├── styles/
│   ├── 01-base.css                  reset, design tokens, panels, keyframes, typography, top nav
│   ├── 02-layout.css                bottom tab bar, home, auth, cards list, create form
│   ├── 03-notifications.css         notifications + toasts
│   ├── 04-moments.css               held-emoji system, chat picker, moment window
│   └── 05-profile-viewer-kitty.css  profile/settings, card viewer, modals, kitty game
├── html/
│   └── body.html                    original markup (auth + app panels) unchanged
└── js/
    ├── 01-db.js              DB engine (localStorage) + global state vars
    ├── 02-panels-auth.js     showPanel, login / signup / logout
    ├── 03-app-init.js        initApp, updateStats, tab navigation
    ├── 04-cards.js           home grid, cards list, create / edit / save card
    ├── 05-notifications.js   notif list, toast, addActivity
    ├── 06-moments.js         moment window — emoji bar, hold engine, char reactions, chat
    ├── 07-profile.js         profile edit modal, password modal
    ├── 08-card-viewer.js     openCardViewer, applyCardTheme, CSS character builder
    ├── 09-kitty-game.js      pet / feed / forgive flow, starfield canvas, hash router, utils
    └── 10-bootstrap.js       boot IIFE — restore session or show auth
```

## Why plain `<script>` tags (no modules)

The original code attaches every function to the global scope and the
markup uses inline handlers like `onclick="doLogin()"`. ES modules would
hide those functions and break every button. The shell loads each file as
a classic script in dependency order, which preserves the behavior 1:1.

## Editing rules

- Add new globals at the **bottom** of the file that owns the feature.
- Keep file order in `sorry-kitty.html` — moving `06-moments.js` above
  `04-cards.js` (for example) will break references.
- Markup tweaks go in `html/body.html`. New CSS goes in the matching
  section file, or a new `06-*.css` linked from the shell.
