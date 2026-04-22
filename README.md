# Algorithm Adventures — הרפתקאות אלגוריתמיות

Hebrew voice-controlled coding game for pre-readers (age ~5). The child records a batch of spoken movement commands, hears them confirmed via TTS, then presses ▶ to watch the turtle execute the whole recipe.

**Teaching goal:** *programming as a recipe* — a computer needs a finalized list of instructions before it can act, not real-time reactions.

**v1 scope:** Tutorial + 4 turtle-maze levels. (Coffee Recipe game is planned for v2.)

## Running

The browser's Web Speech API needs mic permission, which requires a *secure origin*. `file://` won't work — serve the folder over localhost:

```bash
cd algorithm-adventures
python3 -m http.server 8000
```

Open **Chrome** (desktop) at `http://localhost:8000`. Click anywhere to start, then grant microphone permission when the red mic button is pressed.

## Commands the child can say

- **Directions:** `ימינה` (right), `שמאלה` (left), `למעלה` (up), `למטה` (down)
- **Counts 1–10:** digits or Hebrew words; both genders accepted (e.g. `שלוש` / `שלושה`)
- **Multi-command:** a single recording can contain several commands in a row

Examples:

| Said | Parsed |
|---|---|
| `צעד אחד למעלה` | `[↑ 1]` |
| `שלושה צעדים ימינה` | `[→ 3]` |
| `ימינה` | `[→ 1]` (count defaults to 1) |
| `שמאלה אחד למעלה שניים` | `[← 1] [↑ 2]` |

After each phrase the narrator echoes what was heard (TTS) and the corresponding icon appears in the command log. Press 🟢 when the recipe is ready.

## Buttons

- 🔴 **Record** — click, then speak. Stays open 7 s waiting for speech and 3 s after each pause. Bright red halo pulses while listening.
- 🟢 **Go** — execute the queue
- 🟡 **Reset** — clear the queue and return the turtle home (pressed between commands, not during execution)

## Animations & feedback

- **Success:** turtle eats the lettuce, victory arpeggio, auto-advance to the next level
- **Wall hit:** turtle lunges and bumps, thud sound, four yellow stars swirl around its head in an elliptical orbit (cartoon-dizzy)
- **Recipe fails to reach lettuce:** turtle wobbles, three teardrops fall, descending sad tones, TTS commiserates, turtle slides back home to try again
- **Mic mis-hears:** TTS says "לא הבנתי, אפשר לנסות שוב?" — nothing is added to the queue

## Levels

| # | Layout | Teaches |
|---|---|---|
| 0 (tutorial) | Single lettuce one tile above turtle | Basic record → confirm → Go loop |
| 1 | Straight 3-tile corridor | Forward + counting |
| 2 | Open 6×6 grid, lettuce diagonally away | Two-command sequences |
| 3 | Zig-zag with a wall row | Planning around obstacles |
| 4 | Lettuce inside a U-pocket with dead-end branches | Thinking before speaking |

## Architecture

Zero dependencies, no build step. Plain HTML + CSS + ES modules.

```
algorithm-adventures/
├── index.html        # RTL Hebrew layout, SVG button icons
├── styles.css        # Bright palette, recording halo, pressed states
├── js/
│   ├── svg.js        # Turtle, walls, lettuce, tears, stars, command-log icons
│   ├── parser.js     # Hebrew multi-command parser (direction + 1–10, both genders)
│   ├── speech.js     # webkitSpeechRecognition (continuous + silence auto-stop) + chained speechSynthesis
│   └── game.js       # State, levels, tutorial, rAF animations, WebAudio SFX
└── package.json      # type: module (required for ESM file serving)
```

**Animations** are driven by `requestAnimationFrame`, not CSS transitions. Early versions used CSS `transition: transform` on the turtle; mixed with the default SVG `transform-box: view-box`, rotations interpolated around the viewport center and the turtle would visually fly across the board mid-transition. All motion now lives in JS so the origin is explicit.

**Sound effects** are synthesized live via Web Audio (no audio files): thud (80 Hz sine), crunch (filtered white noise), victory arpeggio, sad descending triangle-wave tones.

## Browser support

**Desktop Chrome only.** Firefox and Safari do not implement `webkitSpeechRecognition` for Hebrew. Mic permission requires `http://localhost` or HTTPS; `file://` is blocked.
