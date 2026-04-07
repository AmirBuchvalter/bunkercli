# BunkerCLI

```
  ██████╗ ██╗   ██╗███╗   ██╗██╗  ██╗███████╗██████╗  ██████╗██╗     ██╗
  ██╔══██╗██║   ██║████╗  ██║██║ ██╔╝██╔════╝██╔══██╗ ██╔════╝██║     ██║
  ██████╔╝██║   ██║██╔██╗ ██║█████╔╝ █████╗  ██████╔╝ ██║     ██║     ██║
  ██╔══██╗██║   ██║██║╚██╗██║██╔═██╗ ██╔══╝  ██╔══██╗ ██║     ██║     ██║
  ██████╔╝╚██████╔╝██║ ╚████║██║  ██╗███████╗██║  ██║ ╚██████╗███████╗██║
  ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝╚══════╝╚═╝
```

A colorful, interactive terminal tool for monitoring your system resources in real time — disk, RAM, CPU, GPU, and I/O — built with Node.js.

---

## Requirements

- [Node.js](https://nodejs.org/) v18 or higher

To check if Node.js is already installed:

```bash
node --version
```

If not installed, download it from [nodejs.org](https://nodejs.org/) and run the installer.

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/bunkercli.git
cd bunkercli
```

### 2. Install dependencies

```bash
npm install
```

This installs the following libraries:

| Library | Version | Purpose |
|---|---|---|
| [`systeminformation`](https://www.npmjs.com/package/systeminformation) | ^5.x | Reads CPU, RAM, disk, GPU, and I/O stats from the OS |
| [`chalk`](https://www.npmjs.com/package/chalk) | ^5.x | Colorful terminal output |

> `readline` is built into Node.js — no installation needed.

---

## Running BunkerCLI

```bash
node index.js
```

This opens the interactive prompt:

```
bunker>
```

### Install as a global command (optional)

To run `bunker` from anywhere on your system:

```bash
npm link
```

> On Windows, run your terminal as **Administrator** for this to work.

Then launch from anywhere:

```bash
bunker
```

To uninstall the global command:

```bash
npm unlink -g clitool
```

---

## Commands

All commands work with or without the `/` prefix.

| Command | Alias | Description |
|---|---|---|
| `all` | `/all` | Show all sections |
| `disk` | `/disk` | Disk usage per drive |
| `ram` | `/ram` | RAM usage |
| `cpu` | `/cpu` | CPU load per core |
| `gpu` | `/gpu` | GPU load and VRAM |
| `io` | `/io` | Disk read/write speed |
| `clear` | `/clear` | Clear the screen |
| `help` | `/help` | Show help |
| `exit` | `/exit` | Quit BunkerCLI |

You can also combine commands:

```
bunker> ram gpu
bunker> /disk /cpu
```

---

## Color Guide

Progress bars change color based on usage:

| Color | Range | Status |
|---|---|---|
| Green | 0% – 60% | Normal |
| Yellow | 60% – 85% | Moderate |
| Red | 85%+ | High |

---

## Disk I/O — Admin note

On **Windows**, Disk I/O stats require elevated privileges. If you see:

```
No disk I/O data available (try running as admin)
```

Run your terminal as Administrator and try again.

---

## Project structure

```
bunkercli/
├── index.js        # Main entry point
├── package.json    # Project config and dependencies
├── README.md       # This file
└── USER_GUIDE.md   # Detailed user guide
```
