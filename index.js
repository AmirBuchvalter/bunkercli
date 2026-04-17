#!/usr/bin/env node
import si from 'systeminformation';
import chalk from 'chalk';
import readline from 'readline';
import { showManual } from './manual.js';
import {
  initGame, game,
  showPrompt, gameTick, printAbovePrompt,
  restartBunker, startGame, togglePowerSave, detonate,
} from './game.js';
import * as zombies from './managers/zombieManager.js';
import * as chores  from './managers/choreManager.js';
import * as npcs    from './managers/npcManager.js';
import * as chat    from './managers/chatManager.js';

const { stdout } = process;
const BAR_WIDTH = 30;

// ── Boot animation ────────────────────────────────────────────────────────────

const RESET = '\x1b[0m';
const rgb   = (r, g, b) => `\x1b[38;2;${r};${g};${b}m`;
const bgRgb = (r, g, b) => `\x1b[48;2;${r};${g};${b}m`;

const cursor = {
  hide : () => stdout.write('\x1b[?25l'),
  show : () => stdout.write('\x1b[?25h'),
  up   : (n) => stdout.write(`\x1b[${n}A`),
  col1 : ()  => stdout.write('\x1b[1G'),
  clr  : ()  => stdout.write('\x1b[2K'),
};

const OC = {
  dark     : rgb(136,  34,   0),
  mid      : rgb(204,  85,  34),
  hi       : rgb(255, 119,  51),
  eye      : rgb(255, 238, 204),
  muted    : rgb( 85,  85,  85),
  bright   : rgb(240, 236, 224),
  accent   : rgb(204, 136,  85),
  green    : rgb(109, 179, 122),
  amber    : rgb(232, 184,  75),
  dimgfx   : rgb( 42,  42,  42),
  concrete : rgb( 90,  90,  85),
  military : rgb( 75, 110,  55),
  leaves   : rgb( 46,  95,  50),
  trunk    : rgb( 80,  45,  20),
};

// Day frames only. Night is represented in the prompt by the ☽ icon.
const TREE_ROWS = [
  [0,0,0,6,0,0,0,0,0,6,0,0,0],
  [0,0,6,6,6,0,0,0,6,6,6,0,0],
  [0,6,6,6,6,6,0,6,6,6,6,6,0],
  [0,0,6,1,6,0,0,0,6,1,6,0,0],
  [7,7,7,1,7,7,7,7,7,1,7,7,7],
  [2,2,2,2,2,2,2,2,2,2,2,2,2],
  [2,3,3,3,3,3,3,3,3,3,3,3,2],
  [2,3,0,0,0,0,0,0,0,0,0,3,2],
];
const BUNKER_FLOOR = [2,3,3,3,3,3,3,3,3,3,3,3,2];

const FRAMES = [
  [
    ...TREE_ROWS,
    [2,3,0,0,0,4,0,0,0,0,0,3,2],
    [2,3,0,0,5,5,5,0,0,0,0,3,2],
    [2,3,0,0,5,0,5,0,0,0,0,3,2],
    BUNKER_FLOOR,
  ],
  [
    ...TREE_ROWS,
    [2,3,0,0,0,0,4,0,0,0,0,3,2],
    [2,3,0,0,0,5,5,5,0,0,0,3,2],
    [2,3,0,0,0,5,0,5,0,0,0,3,2],
    BUNKER_FLOOR,
  ],
  [
    ...TREE_ROWS,
    [2,3,0,0,0,0,0,4,0,0,0,3,2],
    [2,3,0,0,0,0,5,5,5,0,0,3,2],
    [2,3,0,0,0,0,5,0,5,0,0,3,2],
    BUNKER_FLOOR,
  ],
];

const PAL_FG = [null, OC.trunk, OC.dark, OC.concrete, OC.eye, OC.military, OC.leaves, OC.green];
const rgbNums = (esc) => { const m = esc.match(/38;2;(\d+);(\d+);(\d+)/); return m ? [+m[1],+m[2],+m[3]] : [0,0,0]; };

function renderRows(rows) {
  return rows.map(row => {
    let s = '';
    for (const v of row) {
      if (PAL_FG[v]) {
        const [r,g,b] = rgbNums(PAL_FG[v]);
        s += bgRgb(r,g,b) + '  ' + RESET;
      } else {
        s += '  ';
      }
    }
    return s;
  });
}

function renderFrame(fi) { return renderRows(FRAMES[fi]); }

function padLabel(str, len) {
  const visible = str.replace(/\x1b\[[^m]*m/g, '');
  return str + ' '.repeat(Math.max(0, len - visible.length));
}

async function bootScreen() {
  const name    = 'BunkerCLI';
  const version = 'v1.1.0';

  cursor.hide();

  const f0 = renderFrame(1);
  const HEADER_LINES = [
    '',
    `  ${f0[0]}  ${OC.bright}${name}${RESET}`,
    `  ${f0[1]}  ${OC.muted}${version}${RESET}`,
    ...f0.slice(2).map(row => `  ${row}`),
    '',
    `  ${OC.dimgfx}${'─'.repeat(54)}${RESET}`,
    '',
  ];

  for (const line of HEADER_LINES) stdout.write(line + '\n');

  const OCTO_ROW_COUNT = f0.length;
  let linesBelow = HEADER_LINES.length - (2 - 1) - OCTO_ROW_COUNT;

  let frameIdx = 1, animDir = 1;

  function redrawOcto() {
    const termRows = process.stdout.rows || 24;
    if (linesBelow + OCTO_ROW_COUNT + 1 >= termRows) return;

    cursor.col1();
    cursor.up(linesBelow + OCTO_ROW_COUNT);
    const f = renderFrame(frameIdx);
    stdout.write(`  ${f[0]}  ${OC.bright}${name}${RESET}\n`);
    stdout.write(`  ${f[1]}  ${OC.muted}${version}${RESET}\n`);
    for (let r = 2; r < OCTO_ROW_COUNT; r++) stdout.write(`  ${f[r]}\n`);
    if (linesBelow > 0) stdout.write(`\x1b[${linesBelow}B`);
    cursor.col1();
  }

  const animTimer = setInterval(() => {
    frameIdx += animDir;
    if (frameIdx >= FRAMES.length - 1) animDir = -1;
    if (frameIdx <= 0)                 animDir =  1;
    redrawOcto();
  }, 380);

  const SPIN = ['·', '✻', '✽', '✶', '✳', '✢'];

  const checks = [
    { label: 'Sealing bunker hatches', delay: 400, ok: '✓ sealed' },
    { label: 'Warming solar panels',   delay: 350, ok: '✓ online' },
    { label: 'Tuning the old radio',   delay: 380, ok: '✓ clear'  },
  ];

  for (const check of checks) {
    const label = padLabel(OC.muted + check.label + RESET, 30 + OC.muted.length + RESET.length);
    let si_idx = 0;

    stdout.write(`  ${label} ${OC.muted}${SPIN[0]}${RESET}`);

    const spinTimer = setInterval(() => {
      si_idx = (si_idx + 1) % SPIN.length;
      cursor.col1(); cursor.clr();
      stdout.write(`  ${label} ${OC.muted}${SPIN[si_idx]}${RESET}`);
    }, 90);

    await new Promise(r => setTimeout(r, check.delay));

    clearInterval(spinTimer);
    cursor.col1(); cursor.clr();
    stdout.write(`  ${label} ${OC.green}${check.ok}${RESET}\n`);
    linesBelow++;
    await new Promise(r => setTimeout(r, 30));
  }

  clearInterval(animTimer);

  stdout.write('\n');
  linesBelow++;
  const barLabel = `  ${OC.muted}Initializing runtime${RESET}`;
  const BOOT_BAR = 28;

  for (let i = 0; i <= BOOT_BAR; i++) {
    cursor.col1(); cursor.clr();
    const filled = OC.accent + '█'.repeat(i)            + RESET;
    const empty  = OC.dimgfx + '░'.repeat(BOOT_BAR - i) + RESET;
    const pct    = OC.muted  + String(Math.round(i / BOOT_BAR * 100)).padStart(3) + '%' + RESET;
    stdout.write(`${barLabel}  ${filled}${empty}  ${pct}`);
    await new Promise(r => setTimeout(r, 28));
  }
  cursor.col1(); cursor.clr();
  stdout.write(`${barLabel}  ${OC.green}${'█'.repeat(BOOT_BAR)}${RESET}  ${OC.green}100%${RESET}\n`);

  linesBelow += 2;
  frameIdx = 1;
  redrawOcto();

  stdout.write('\n');
  stdout.write(`  ${OC.green}✓${RESET} ${OC.bright}Bunker secured.${RESET}  ${OC.muted}Type ${OC.accent}/help${OC.muted} for commands.${RESET}\n`);
  stdout.write('\n');

  cursor.show();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function bar(percent, color) {
  const filled = Math.round((percent / 100) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  const filledBar = color('█'.repeat(filled));
  const emptyBar = chalk.gray('░'.repeat(empty));
  return `[${filledBar}${emptyBar}] ${chalk.white(percent.toFixed(1).padStart(5))}%`;
}

function bytes(b) {
  if (b >= 1e12) return (b / 1e12).toFixed(2) + ' TB';
  if (b >= 1e9)  return (b / 1e9).toFixed(2)  + ' GB';
  if (b >= 1e6)  return (b / 1e6).toFixed(2)  + ' MB';
  return b + ' B';
}

function section(title) {
  console.log('\n' + chalk.bold.cyan('━━━ ') + chalk.bold.white(title) + chalk.bold.cyan(' ━━━'));
}

function header() {
  const b = chalk.bold.green;
  const c = chalk.bold.cyan;
  console.log(b('  ██████╗ ██╗   ██╗███╗   ██╗██╗  ██╗███████╗██████╗  ') + c('██████╗██╗     ██╗'));
  console.log(b('  ██╔══██╗██║   ██║████╗  ██║██║ ██╔╝██╔════╝██╔══██╗ ') + c('██╔════╝██║     ██║'));
  console.log(b('  ██████╔╝██║   ██║██╔██╗ ██║█████╔╝ █████╗  ██████╔╝ ') + c('██║     ██║     ██║'));
  console.log(b('  ██╔══██╗██║   ██║██║╚██╗██║██╔═██╗ ██╔══╝  ██╔══██╗ ') + c('██║     ██║     ██║'));
  console.log(b('  ██████╔╝╚██████╔╝██║ ╚████║██║  ██╗███████╗██║  ██║ ') + c('╚██████╗███████╗██║'));
  console.log(b('  ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ') + c('╚═════╝╚══════╝╚═╝'));
  console.log(chalk.dim('  System resource monitor\n'));
}

initGame({ header });

// ── Help ──────────────────────────────────────────────────────────────────────

function showHelp() {
  console.clear();
  header();
  console.log(chalk.bold.white('USAGE'));
  console.log(`  ${chalk.cyan('node index.js')} ${chalk.yellow('[/option]')}\n`);

  console.log(chalk.bold.white('GAME'));
  const gameOpts = [
    ['/start',       'Begin a survival session'],
    ['/attack',      'Fight off an active zombie wave (-20% battery)'],
    ['/powersave',   'Power-save mode for 60s (pauses chores & wave countdown)'],
    ['/detonate',    'Last resort during blackout — 50% chance of survival'],
    ['/restart',     'Rebuild the bunker after death'],
  ];
  for (const [flag, desc] of gameOpts) console.log(`  ${chalk.yellow(flag.padEnd(18))} ${chalk.white(desc)}`);

  console.log('\n' + chalk.bold.white('CHORES'));
  const choreOpts = [
    ['/watercycle',  'Run the water recycling loop (-20% battery)'],
    ['/sweep',       'Clear debris from the bunker (-8% battery)'],
    ['/plants',      'Water the plants (-6% battery)'],
    ['/vents',       'Wash the air vents (-10% battery)'],
  ];
  for (const [flag, desc] of choreOpts) console.log(`  ${chalk.yellow(flag.padEnd(18))} ${chalk.white(desc)}`);

  console.log('\n' + chalk.bold.white('VISITORS'));
  const npcOpts = [
    ['/admit',       'Admit the visitor at the hatch'],
    ['/turnaway',    'Send the visitor away'],
    ['/talk',        'Re-open conversation with a staying guest'],
    ['1, 2, 3',      'Respond during a conversation'],
  ];
  for (const [flag, desc] of npcOpts) console.log(`  ${chalk.yellow(flag.padEnd(18))} ${chalk.white(desc)}`);

  console.log('\n' + chalk.bold.white('SYSTEM INFO'));
  const sysOpts = [
    ['/all',         'Show all sections'],
    ['/disk',        'Show disk usage only'],
    ['/ram',         'Show RAM usage only'],
    ['/cpu',         'Show CPU usage only'],
    ['/gpu',         'Show GPU usage only'],
    ['/io',          'Show Disk I/O only'],
    ['/clear',       'Clear the screen'],
    ['/help, /h',    'Show this help message'],
    ['/exit',        'Quit the program'],
  ];
  for (const [flag, desc] of sysOpts) console.log(`  ${chalk.yellow(flag.padEnd(18))} ${chalk.white(desc)}`);

  console.log('');
}

// ── Sections ──────────────────────────────────────────────────────────────────

async function showDisk() {
  const disks = await si.fsSize();
  section('DISK USAGE');
  for (const disk of disks) {
    if (!disk.size) continue;
    const usedPct = (disk.used / disk.size) * 100;
    const color = usedPct > 85 ? chalk.red : usedPct > 60 ? chalk.yellow : chalk.green;
    console.log(chalk.bold.white(`  ${(disk.fs || disk.mount).padEnd(20)}`), bar(usedPct, color));
    console.log(chalk.dim(`  ${''.padEnd(20)} Used: ${bytes(disk.used)} / ${bytes(disk.size)}  Free: ${bytes(disk.available)}`));
  }
}

async function showRam() {
  const mem = await si.mem();
  section('MEMORY (RAM)');
  const ramPct = (mem.active / mem.total) * 100;
  const ramColor = ramPct > 85 ? chalk.red : ramPct > 60 ? chalk.yellow : chalk.green;
  console.log('  ' + bar(ramPct, ramColor));
  console.log(chalk.dim(`  Used: ${bytes(mem.active)}  /  Total: ${bytes(mem.total)}  /  Free: ${bytes(mem.available)}`));
}

async function showCpu() {
  const cpuLoad = await si.currentLoad();
  section('CPU USAGE');
  const cpuPct = cpuLoad.currentLoad;
  const cpuColor = cpuPct > 85 ? chalk.red : cpuPct > 60 ? chalk.yellow : chalk.green;
  console.log('  Overall  ' + bar(cpuPct, cpuColor));
  cpuLoad.cpus.forEach((core, i) => {
    const c = core.load > 85 ? chalk.red : core.load > 60 ? chalk.yellow : chalk.green;
    console.log(`  Core ${String(i).padStart(2)}  ${bar(core.load, c)}`);
  });
}

async function showGpu() {
  const gpus = await si.graphics();
  section('GPU USAGE');
  const controllers = gpus.controllers.filter(g => g.utilizationGpu != null);
  if (controllers.length === 0) {
    console.log(chalk.dim('  No GPU utilization data available.'));
    return;
  }
  for (const gpu of controllers) {
    const gpuPct = gpu.utilizationGpu ?? 0;
    const vramPct = gpu.memoryUsed && gpu.memoryTotal ? (gpu.memoryUsed / gpu.memoryTotal) * 100 : null;
    const gpuColor = gpuPct > 85 ? chalk.red : gpuPct > 60 ? chalk.yellow : chalk.green;
    console.log(chalk.bold.white(`  ${(gpu.model || 'GPU').substring(0, 28).padEnd(28)}`));
    console.log('  GPU Load  ' + bar(gpuPct, gpuColor));
    if (vramPct !== null) {
      const vColor = vramPct > 85 ? chalk.red : vramPct > 60 ? chalk.yellow : chalk.green;
      console.log('  VRAM      ' + bar(vramPct, vColor));
      console.log(chalk.dim(`  VRAM Used: ${bytes(gpu.memoryUsed * 1024 * 1024)} / ${bytes(gpu.memoryTotal * 1024 * 1024)}`));
    }
  }
}

async function showIO() {
  const diskIO = await si.disksIO();
  section('DISK I/O');
  if (!diskIO || (!diskIO.rIO_sec && !diskIO.wIO_sec)) {
    console.log(chalk.dim('  No disk I/O data available (try running as admin).'));
    return;
  }
  const readMB  = (diskIO.rIO_sec ?? 0) / 1024 / 1024;
  const writeMB = (diskIO.wIO_sec ?? 0) / 1024 / 1024;
  const tIOps   = (diskIO.tIO_sec ?? 0);
  console.log(`  ${chalk.green('Read ')}  ${chalk.bold.green(readMB.toFixed(2).padStart(8) + ' MB/s')}`);
  console.log(`  ${chalk.yellow('Write')}  ${chalk.bold.yellow(writeMB.toFixed(2).padStart(8) + ' MB/s')}`);
  console.log(`  ${chalk.cyan('IOps ')}  ${chalk.bold.cyan(tIOps.toFixed(0).padStart(8) + ' ops/s')}`);
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function spinner(label) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const id = setInterval(() => {
    process.stdout.write(`\r  ${chalk.cyan(frames[i++ % frames.length])}  ${chalk.dim(label)}`);
  }, 80);
  return () => {
    clearInterval(id);
    process.stdout.write('\r\x1b[2K');
  };
}

// ── Command handler ───────────────────────────────────────────────────────────

function tryChatChoice(input, rl) {
  if (!chat.isActive()) return false;
  const trimmed = input.trim();
  if (!/^[123]$/.test(trimmed)) return false;
  npcs.handleChoice(parseInt(trimmed, 10), rl);
  return true;
}

async function runCommand(input, rl) {
  if (tryChatChoice(input, rl)) return;

  const args = input.trim().toLowerCase().split(/\s+/).filter(Boolean).map(a => a.replace(/^\//, ''));
  if (args.length === 0) return;

  if (args.includes('help') || args.includes('h') || args.includes('?')) { showHelp(); return; }
  if (args.includes('clear')) { console.clear(); header(); return; }

  if (args.includes('start')) {
    if (game.gameMode && game.alive) {
      console.log(chalk.dim('  A game session is already in progress.\n'));
    } else {
      await bootScreen();
      startGame();
    }
    return;
  }

  if (args.includes('restart')) {
    if (!game.gameMode) {
      console.log(chalk.dim('  No game session to restart. Type ') + chalk.yellow('/start') + chalk.dim(' to begin one.\n'));
    } else if (game.alive) {
      console.log(chalk.dim('  Bunker is already operational.\n'));
    } else {
      restartBunker();
    }
    return;
  }

  if (game.gameMode && !game.alive) {
    console.log(chalk.dim('  You are dead. Type ') + chalk.yellow('/restart') + chalk.dim(' to rebuild the bunker.\n'));
    return;
  }

  if (args.includes('attack')) {
    if (!game.gameMode) { console.log(chalk.dim('  No game in progress. Type ') + chalk.yellow('/start') + chalk.dim(' first.\n')); }
    else { zombies.attackZombies(); }
    return;
  }

  if (args.includes('admit')) {
    if (!game.gameMode) { console.log(chalk.dim('  No game in progress.\n')); return; }
    npcs.admit(rl); return;
  }
  if (args.includes('turnaway')) {
    if (!game.gameMode) { console.log(chalk.dim('  No game in progress.\n')); return; }
    npcs.turnAway(rl); return;
  }
  if (args.includes('talk')) {
    if (!game.gameMode) { console.log(chalk.dim('  No game in progress.\n')); return; }
    npcs.talk(rl); return;
  }

  const choreIds = ['watercycle', 'sweep', 'plants', 'vents'];
  const choreArg = args.find(a => choreIds.includes(a));
  if (choreArg) {
    if (!game.gameMode) { console.log(chalk.dim('  No game in progress. Type ') + chalk.yellow('/start') + chalk.dim(' first.\n')); return; }
    chores.runManually(choreArg); return;
  }

  if (args.includes('powersave')) {
    if (!game.gameMode) { console.log(chalk.dim('  No game in progress.\n')); return; }
    togglePowerSave(); return;
  }

  if (args.includes('detonate')) {
    if (!game.gameMode) { console.log(chalk.dim('  No game in progress.\n')); return; }
    await detonate(rl); return;
  }

  const known = ['disk', 'ram', 'cpu', 'gpu', 'io', 'all', 'clear', 'help', 'h', '?', 'exit', 'quit', 'detonate'];
  const unknown = args.filter(a => !known.includes(a));
  if (unknown.length) {
    console.log(chalk.red(`  Unknown command: ${unknown.join(', ')}`));
    console.log(chalk.dim('  Type /help to see available commands.\n'));
    return;
  }

  const all      = args.includes('all');
  const wantDisk = all || args.includes('disk');
  const wantRam  = all || args.includes('ram');
  const wantCpu  = all || args.includes('cpu');
  const wantGpu  = all || args.includes('gpu');
  const wantIO   = all || args.includes('io');

  if (wantDisk) { const stop = spinner('Reading disk usage...'); await showDisk(); stop(); }
  if (wantRam)  { const stop = spinner('Reading memory...');     await showRam();  stop(); }
  if (wantCpu)  { const stop = spinner('Reading CPU load...');   await showCpu();  stop(); }
  if (wantGpu)  { const stop = spinner('Reading GPU stats...');  await showGpu();  stop(); }
  if (wantIO)   { const stop = spinner('Reading disk I/O...');   await showIO();   stop(); }

  console.log('');
}

// ── Day / night cycle ─────────────────────────────────────────────────────────

const CYCLE_MS = 3 * 60 * 1000;

async function playDayNightAnim(rl, toNight) {
  if (toNight) {
    const frames = [
      chalk.yellow('  ☀') + chalk.dim('  the sun begins to sink...'),
      chalk.dim('  ◑  dusk settles in...'),
      chalk.blue('  ☽  ') + chalk.dim('night falls over the bunker.'),
    ];
    for (const f of frames) { printAbovePrompt(rl, f); await new Promise(r => setTimeout(r, 500)); }
  } else {
    const frames = [
      chalk.blue('  ☽') + chalk.dim('  the moon fades...'),
      chalk.dim('  ◐  first light on the horizon...'),
      chalk.yellow('  ☀  ') + chalk.dim('dawn breaks — solar receivers online.'),
    ];
    for (const f of frames) { printAbovePrompt(rl, f); await new Promise(r => setTimeout(r, 500)); }
  }
}

function startDayNightCycle(rl) {
  return setInterval(() => {
    if (game.animating) return;
    if (!game.gameMode || !game.alive) return;
    game.isNight = !game.isNight;
    playDayNightAnim(rl, game.isNight);
  }, CYCLE_MS);
}

// ── Interactive prompt ────────────────────────────────────────────────────────

function startPrompt() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.bold.green('bunker') + chalk.cyan('> '),
  });

  showPrompt(rl);

  const tickTimer  = setInterval(() => gameTick(rl), 500);
  const cycleTimer = startDayNightCycle(rl);

  rl.on('line', async (line) => {
    game.atPrompt = false;
    const input = line.trim();

    const cmd = input.toLowerCase();
    if (cmd === '/exit' || cmd === '/quit' || cmd === 'exit' || cmd === 'quit') {
      clearInterval(tickTimer);
      clearInterval(cycleTimer);
      console.log(chalk.dim('\n  Goodbye!\n'));
      process.exit(0);
    }

    try {
      await runCommand(input, rl);
    } catch (err) {
      console.error(chalk.red('  Error: ') + err.message + '\n');
    }

    showPrompt(rl);
  });

  rl.on('close', () => {
    clearInterval(tickTimer);
    clearInterval(cycleTimer);
    process.exit(0);
  });
}

// ── Entry point ───────────────────────────────────────────────────────────────

header();
showManual();
startPrompt();
