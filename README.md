# ONE MORE BOUNCE

A first-person browser survival-horror game set in the abandoned JumpZone trampoline park. Built with HTML, CSS, JavaScript, and Three.js; visuals and sound effects are generated procedurally.

## Run locally

The game uses ES modules and loads Three.js from jsDelivr, so open it through a local web server (not by double-clicking `index.html`).

### Python

```bash
cd one-more-bounce
python -m http.server 8000
```

Then open **http://localhost:8000** in a modern desktop browser. Internet access is needed on first load for Three.js and the Google Fonts stylesheet.

### Node

```bash
npx serve .
```

## Controls

- **WASD** — move
- **Mouse** — look around (click to lock the pointer)
- **Space** — jump; trampolines launch you automatically
- **Shift** — sprint (uses stamina)
- **Ctrl** — crouch and make less noise
- **E** — interact / hide / leave hiding
- **F** — toggle flashlight
- **Esc** — pause

## Current playable sequence

1. Restore the reception lights.
2. Read the party booking note and unlock the supply cabinet with its four-digit code.
3. Collect the three generator fuses and route the generator phases in the correct order.
4. Retrieve the manager keycard.
5. Override the emergency exit and escape.

The Bouncer reacts to sound, investigates, searches, and hunts when it sees you. Trampoline landings and sprinting can draw it toward your position. Hiding spots break sight, but staying too close to the creature is dangerous.

## Notes

- This is a self-contained indie-game foundation, not a packaged commercial release. The map, enemy, animation, puzzles, UI, and audio are procedural; the current implementation uses simplified collision and navigation compared with a dedicated game engine.
- For best performance, use a desktop browser with WebGL enabled and headphones.
