# assets/art — the Phase-4 art wave

47 shipped webp assets generated with ONE style template (ashen greyscale +
candlelight ember, chiaroscuro ink) so the board never reads as stitched:

- `classes/` 4 portraits — the duel player panels, creation, the Codex
- `enemies/` 21 portraits — one per §9.1–9.3 campaign fight, the duel panels
- `plates/`  10 environments — title key art + the §3 chapter plates (§11.2 slot)
- `items/`   12 icons — the Armory/Codex

`raw/` holds the full-resolution PNG generations and is **gitignored**;
`scripts/gen-art.mjs` regenerates any file from its prompt (skip-existing),
and `scripts/optimize-art.py` performs the resize/webp pass with the weight
manifest. Weight budget: tracked, never silently shaved ([GDD] §15).
