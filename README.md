# Who Wins? — whowins.soccer

Single-viewport prediction page for the Who Wins? quant system (formerly
Oracle). Norway vs England, World Cup 2026 quarter-final. React + Vite, light
mode, Helvetica Bold.

## Run

```sh
npm install
npm run dev        # dev server
npm run build      # production build → dist/
npm run preview    # serve dist/ on :4173
npm run shots      # playwright screenshots of :4173 → shots/
```

## Where the backend plugs in

All page content renders from `src/data/feed.js`, which mirrors the payload the
backend agent swarm publishes. Replace the static export with a fetch of the
live endpoint. The poll (`src/components/Poll.jsx`) currently stores the
visitor's vote in `localStorage` on top of seeded counts — point `cast()` at the
poll service when it exists.

`legacy/index.html` is the original v1 dark editorial page (self-contained, no
build).
