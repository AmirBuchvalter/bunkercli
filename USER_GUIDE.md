# SYS — System Resource Monitor CLI

A colorful, terminal-based system resource monitor built with Node.js.

---

## Requirements

- [Node.js](https://nodejs.org/) v18 or higher

---

## Installation

### 1. Clone or download the project

```bash
git clone <your-repo-url>
cd cliTool
```

### 2. Install dependencies

```bash
npm install
```

### 3. (Optional) Install as a global command

This lets you run `sys` from anywhere in your terminal.

```bash
npm link
```

> On Windows, you may need to run your terminal as **Administrator** for `npm link` to work.

---

## Running the tool

### Option A — Run directly with Node

```bash
node index.js
```

### Option B — Run via npm

```bash
npm start
```

### Option C — Run as a global command (after `npm link`)

```bash
sys
```

---

## What it shows

| Section     | Details                                                      |
|-------------|--------------------------------------------------------------|
| Disk Usage  | Used / free / total space per drive, with a progress bar     |
| Memory      | RAM used / available / total, with a progress bar            |
| CPU         | Overall load + per-core breakdown, with progress bars        |
| GPU         | GPU load and VRAM usage (NVIDIA/AMD where supported)         |
| Disk I/O    | Read MB/s, Write MB/s, and total ops/sec                     |

### Color coding

All progress bars change color based on usage level:

| Color  | Usage       |
|--------|-------------|
| Green  | 0% – 60%    |
| Yellow | 60% – 85%   |
| Red    | 85% – 100%  |

---

## Disk I/O — Admin note

On **Windows**, Disk I/O stats require elevated privileges.  
If you see `No disk I/O data available`, run your terminal as Administrator:

1. Search for **PowerShell** or **Command Prompt** in the Start menu
2. Right-click → **Run as Administrator**
3. Navigate to the project folder and run the tool again

---

## Uninstall global command

If you installed with `npm link` and want to remove it:

```bash
npm unlink -g clitool
```

---

## Project structure

```
cliTool/
├── index.js        # Main entry point
├── package.json    # Project config and dependencies
└── USER_GUIDE.md   # This file
```

---

## Dependencies

| Package             | Purpose                          |
|---------------------|----------------------------------|
| `systeminformation` | Reads CPU, RAM, disk, GPU stats  |
| `chalk`             | Terminal color output            |
