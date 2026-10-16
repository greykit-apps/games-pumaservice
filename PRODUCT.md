# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Desktop players of all kinds, new players first: people who never played *Silent Service* should find a submarine approachable, and fans of the 1985 original should recognise its periscope, its TDC and its depth charges. Keyboard or gamepad on a computer, in sessions of one engagement or one patrol; phone play is out of scope.

## Product Purpose

A remake of MicroProse's *Silent Service* (C64, 1985) where the captain is a puma and the enemy is the Wolf Empire: a fleet submarine against escorted convoys, attacked through a periscope with a torpedo data computer, hunted with sonar and depth charges, across target practice, single convoy actions and a five-year war-patrol career. Success is a player who sinks a ship, survives the counter-attack, and wants the next patrol.

## Positioning

The 1985 game's design (the stations, the TDC, angle on the bow, the escorts' hunt, reality levels, war patrols and a career), rebuilt as its own game rather than an emulation. Classic plays as 1985 did; Field adds modern aids; reality is set apart from the aids.

## Operating Context

Part of the greykit.games portfolio, served at greykit.com/games/pumaservice. It opens on the shared greykit boot screen (owner's decision, 2026-10-16: the only thing kept as it is); everything after the boot is the game's own. The career, the service record and a game in progress live in this browser only.

## Capabilities and Constraints

- Plain scripts, no build step, nothing fetched at play time: every picture is drawn and every sound synthesised in the page.
- The engine (`js/engine/`) is DOM-free and deterministic from a seed; `tools/sim-check.js` plays it headless.
- Ships are traced from 3D models at their true angle on the bow (owner's decision, 2026-10-16).
- Desktop only; small screens get a note instead of the game.
- Keyboard first, gamepad supported.
- games-meta STANDARD.md rules apply (credit, Forget everything, menu keys, Settings order, sound).

## Brand Commitments

- The name Puma Service. The captain is a puma; the enemy is the Wolf Empire (owner's decisions, 2026-10-16).
- A fictional archipelago and the Wolf War, Year I to Year V; every place and ship name our own (owner's decision, 2026-10-16).
- Modern hi-bit pixel art at about 640 by 360.
- It must not look like a mobile game, and it must not look like it is running in an emulator.

## Evidence on Hand

No MicroProse code, art, sound or text may be used; the reference disk is gitignored. The numbers are ours (`js/engine/const.js`, marked UNCERTAIN) and still need real play to tune.

## Product Principles

1. The game first: graphics serve reading the sea, the target and the danger.
2. Faithful in play, free in look.
3. Inviting to newcomers without hiding the original's depth.

## Accessibility & Inclusion

Keyboard-complete play and menus; text contrast at WCAG AA; nothing essential conveyed by colour alone; respects reduced motion.
