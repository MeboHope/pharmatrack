# PharmaTrack Brand Update — What Changed

## New/replaced asset files (copy these into your project as-is)
- `public/logo/logo.png` — REPLACED. Was the default placeholder logo PharmaTrack
  ships with (per public/logo/README.md). Now your real brand icon (white ring +
  tea-green cross, transparent background) — used everywhere the logo sits on a
  dark/Baltic-Blue background (navbar, sidebars, auth modal, footer).
- `public/logo/logo-color.png` — NEW. Solid Baltic Blue version of the icon, for
  the two spots where the logo sits on a light background (see below). The white-
  ring version would be invisible there.
- `public/hero/pharmacy-hero.jpg` — NEW. Original illustrated hero background
  (capsules, bottles, soft brand-color glows, subtle grid, large translucent ring
  motif) replacing the flat 3-stop color gradient. Built from scratch in your
  brand palette — no stock photo / licensing concerns.

## Code changes
- `src/components/LandingScreen.tsx`
  - Hero `<section id="home">`: removed the flat
    `bg-gradient-to-br from-[#22577A] via-[#1D506D] to-[#173F57]` background and
    replaced it with the new hero image (`background: url('/hero/pharmacy-hero.jpg')`,
    cover/center) plus a directional gradient scrim
    (`from-[#12324A] via-[#173F57]/90 to-[#1D506D]/55`) on top, so the hero text on
    the left stays fully legible while the image reads clearly further right. The
    existing soft blobs + grid texture were kept as extra layers on top.
- `src/components/FeatureDetails.tsx`
  - The two logo `<img>` tags inside the light-colored (`bg-[#E8F5F0]`) page headers
    now point to `/logo/logo-color.png` instead of `/logo/logo.png`, so the ring is
    visible instead of disappearing into the light background. The third usage (dark
    footer) was left on `/logo/logo.png` since it's already correct there.

## Not changed (already on-brand)
Your codebase already uses Baltic Blue `#22577A` 325+ times and a mint green
`#80ED99` (close to brand Tea Green `#C7F9CC`) throughout — no broad color-token
rework was needed.

## To apply
Copy `src/` and `public/` from this folder into your project root, overwriting the
matching files, then run your normal `npm run dev` / `npm run build`.
