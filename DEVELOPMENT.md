# Puma Service: development

Plain scripts, no build step, nothing fetched at play time: every picture is drawn and every sound synthesised in the page but the boot's meow, a recording carried in `js/gk-intro.js` itself, and the two typefaces are in `fonts/`. What the game is meant to be is in [PRODUCT.md](PRODUCT.md), and how it looks in [DESIGN.md](DESIGN.md).

## What's in here

```
js/engine/   the war, DOM-free: the sea, the boat, the ships and convoys, seeing and being seen, the escorts and aircraft,
             torpedoes and the TDC, the scenarios and the career, a step of it all, and a bot
js/art/      the pixel art: the kit, the tracer, the ship models, the view out, the chart, the instruments, the damage report
js/          rendering, the HUD, input, sound, the screens, settings and the service record, and the loop; gk-title.js (the
             canon boot, games-meta §3) and gk-intro.js (the integrated intro, §14, adapted to the game's own title)
tools/       sim-check (the bot plays every convoy action headless), asset stamps and checks, icons, the share card, the ship sheet
```

## Checks

`node tools/sim-check.js` plays the game headless: the sea is sound, the firing solution hits a target on a steady course, the bot sinks ships in the convoy actions, the escorts hunt, and a game replays step for step and survives being saved and loaded half way. `--patrol` also sails a whole war patrol. `node tools/stamp-assets.js` stamps every script and stylesheet with its hash after an edit. `tools/preview.html` is the ship sheet; `tools/og.html` draws the share card; `node tools/make-icons.js` the icons.
