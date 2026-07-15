# Ｉ ｌ ｌ ｙ ｕ ｎ ｅ  Ｏ Ｓ ™ — instructions for contributors

## Project

`illyu.net` is a static Astro 6 personal site. Its home page is a small
Poolsuite-inspired desktop placed over a procedural pool renderer. It is not a
clone: never copy Poolsuite source, imagery, icons, fonts, or branding into the
repository.

## Architecture

- `src/pages/` contains thin Astro entry points only.
- `src/views/` contains presentational Astro components and markup.
- `src/controllers/` owns browser events, DOM lifecycle, focus, drag and
  cleanup. Keep controllers free of layout markup.
- `src/models/` defines state and shared types.
- `src/services/` contains i18n, persistence and network-facing helpers.
- `src/renderers/` owns the pool canvas/WebGL implementation.
- `src/styles/` contains isolated global concerns such as native cursors.

Keep the MVC boundaries intact. Do not move imperative event code into Astro
views just to make a small visual change.

## Daily workflow

- Start local work with `yarn dev`. It is a watch server and intentionally stays
  running until stopped.
- Run `yarn validate` before handing off a change. It checks formatting, Astro,
  the production build, time-state tests and static-site invariants.
- Check desktop and narrow touch layouts after changing shell, windows, launcher
  or controls. On touch, constrain windows to the safe area without restyling
  their desktop internals unless the layout would otherwise overflow.
- Preserve a dirty worktree: do not reset, discard, reformat unrelated code or
  overwrite user changes.

## Visual and asset rules

- The design may take structural inspiration from late-1990s desktop UIs, but
  use original CSS and licensed/project-supplied assets only.
- Keep UI surfaces opaque; do not add blur, glass, global dither, colour glow or
  new application launchers without a product request.
- Use dither only for the dedicated offset shadow layer and restrained pool
  anti-banding. The shadow must paint below and down-right of its owner.
- Do not invent social posts, follower counts or activity. Use the concise
  profile shell plus an explicit same-tab “open original” action.
- New third-party files need a source and licence record in
  `public/licenses/`. Do not guess a missing licence.

## Protected scope

- Keep the Temmie 404 implementation and its public assets working unless the
  request specifically concerns them.
- Keep the existing contact URLs, avatar and nickname unless the owner asks to
  change them.

## Handoff

Report the user-visible result, files materially changed and commands actually
run. Call out an external asset whose licence still needs confirmation.
