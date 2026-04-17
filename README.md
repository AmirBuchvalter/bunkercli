# BunkerCLI

```
  ██████╗ ██╗   ██╗███╗   ██╗██╗  ██╗███████╗██████╗  ██████╗██╗     ██╗
  ██╔══██╗██║   ██║████╗  ██║██║ ██╔╝██╔════╝██╔══██╗ ██╔════╝██║     ██║
  ██████╔╝██║   ██║██╔██╗ ██║█████╔╝ █████╗  ██████╔╝ ██║     ██║     ██║
  ██╔══██╗██║   ██║██║╚██╗██║██╔═██╗ ██╔══╝  ██╔══██╗ ██║     ██║     ██║
  ██████╔╝╚██████╔╝██║ ╚████║██║  ██╗███████╗██║  ██║ ╚██████╗███████╗██║
  ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝╚══════╝╚═╝
```

An interactive terminal survival game + system monitor. Defend your underground bunker from zombie waves, manage power and chores, receive radio transmissions, and deal with visitors — all while keeping an eye on your real CPU, RAM, disk, and GPU.

---

## Requirements

- [Node.js](https://nodejs.org/) **v18 or higher**

Check your version:

```bash
node --version
```

If not installed, download from [nodejs.org](https://nodejs.org/).

---

## Installation

```bash
git clone https://github.com/your-username/bunkercli.git
cd bunkercli
npm install
```

`npm install` reads `package.json` and installs all dependencies locally into `node_modules/`. That folder is git-ignored — you never need to commit it.

### Dependencies

| Package | Purpose |
|---|---|
| [`chalk`](https://www.npmjs.com/package/chalk) ^5.x | Coloured terminal output |
| [`systeminformation`](https://www.npmjs.com/package/systeminformation) ^5.x | Reads CPU, RAM, disk, GPU, I/O from the OS |

`readline` is built into Node.js — no extra install needed.

---

## Running

```bash
node index.js
```

### Install as a global command (optional)

```bash
npm link        # run once (Windows: use an Admin terminal)
bunker          # then launch from anywhere
```

To uninstall:

```bash
npm unlink -g clitool
```

---

## Quick start

```
bunker> /start     ← seal the hatches and begin the survival session
bunker> /help      ← see all available commands
bunker> /exit      ← quit
```

---

## Survival commands

| Command | Description |
|---|---|
| `/start` | Begin a survival session |
| `/attack` | Fight off an active zombie wave (−20% battery) |
| `/powersave` | Power-save mode for 60 s — pauses chores and wave countdown |
| `/detonate` | Last resort during blackout — 50 % chance of survival |
| `/restart` | Rebuild the bunker after death |

### Chores (keep the bunker running)

| Command | Cost | Description |
|---|---|---|
| `/watercycle` | −20% | Water recycling loop — skipping causes HP loss |
| `/sweep` | −8% | Clear bunker debris |
| `/plants` | −6% | Water the plants |
| `/vents` | −10% | Wash the air vents |

### Visitors

| Command | Description |
|---|---|
| `/admit` | Let the visitor at the hatch inside |
| `/turnaway` | Send them away |
| `/talk` | Re-open conversation with a guest who refused to leave |
| `1` / `2` / `3` | Choose a response during conversation |

### System info

| Command | Description |
|---|---|
| `/all` | Show all sections |
| `/cpu` `/ram` `/disk` `/gpu` `/io` | Show individual sections |
| `/clear` | Clear the screen |
| `/help` | Full command reference |

---

## Battery & power

- Battery drains **−10% every 30 seconds** at all times.
- During **daytime** ☀, solar panels recharge the battery (~7.5%/30 s) — but drain still exceeds gain, so manage carefully.
- At **night** ☽, no solar. Drain is full −10%/30 s.
- **Blackout** (battery = 0): guards offline, hatch unsecured — zombies breach instantly, strangers walk in without knocking. Use `/detonate` as a last resort.

---

## Project structure

```
bunkercli/
├── index.js              # Entry point, boot animation, CLI routing
├── game.js               # Core game state, prompt, physics tick
├── manual.js             # Startup briefing
├── package.json          # Dependencies (run npm install)
├── managers/
│   ├── zombieManager.js  # Wave scheduling and combat
│   ├── npcManager.js     # Visitor lifecycle
│   ├── chatManager.js    # Conversation engine
│   ├── eventManager.js   # Weather, radio, front-line reports
│   └── choreManager.js   # Chore timers and auto-runs
└── data/
    ├── chats.json         # NPC dialogue trees
    └── events.json        # Weather, radio, and front-line event text
```

---

## Disk I/O — Windows note

Disk I/O stats require elevated privileges on Windows. If you see:

```
No disk I/O data available (try running as admin)
```

Run your terminal as **Administrator** and try again.

---

<img width="601" height="684" alt="bunkercli" src="https://github.com/user-attachments/assets/134e5d5b-67d8-45a9-a212-7c98b8536039" />
