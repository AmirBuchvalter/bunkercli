#!/usr/bin/env node
import si from 'systeminformation';
import chalk from 'chalk';
import readline from 'readline';

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
  dark   : rgb(136,  34,   0),
  mid    : rgb(204,  85,  34),
  hi     : rgb(255, 119,  51),
  eye    : rgb(255, 238, 204),
  muted  : rgb( 85,  85,  85),
  bright : rgb(240, 236, 224),
  accent : rgb(204, 136,  85),
  green  : rgb(109, 179, 122),
  amber  : rgb(232, 184,  75),
  dimgfx : rgb( 42,  42,  42),
};

// 0 = empty  1 = dark  2 = mid  3 = hi  4 = eye
// Bunker survivor under fire — 2D man in an underground bunker with incoming missiles.
const FRAMES = [
  // Frame 0 — missile inbound from above
  [ [0,0,0,0,0,0,3],[0,1,1,1,0,0,2],[0,4,3,4,0,0,0],[1,3,3,3,1,0,0],[0,3,3,3,0,0,0],[0,2,0,2,0,0,0],[0,1,0,1,0,0,0] ],
  // Frame 1 — missile closing in on the wall
  [ [0,0,0,0,0,0,0],[0,1,1,1,0,3,0],[0,4,3,4,0,2,0],[1,3,3,3,1,0,0],[0,3,3,3,0,0,0],[0,2,0,2,0,0,0],[0,1,0,1,0,0,0] ],
  // Frame 2 — impact against the bunker
  [ [0,0,0,0,0,0,0],[0,1,1,1,0,0,0],[0,4,3,4,0,0,0],[1,3,3,3,1,3,2],[0,3,3,3,0,2,0],[0,2,0,2,0,0,0],[0,1,0,1,0,0,0] ],
];

const PAL_FG = [null, OC.dark, OC.mid, OC.hi, OC.eye];
const rgbNums = (esc) => { const m = esc.match(/38;2;(\d+);(\d+);(\d+)/); return m ? [+m[1],+m[2],+m[3]] : [0,0,0]; };

function renderFrame(fi) {
  return FRAMES[fi].map(row => {
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

function padLabel(str, len) {
  const visible = str.replace(/\x1b\[[^m]*m/g, '');
  return str + ' '.repeat(Math.max(0, len - visible.length));
}

async function bootScreen() {
  const name    = 'BunkerCLI';
  const version = 'v1.0.0';

  cursor.hide();

  const f0 = renderFrame(0);
  const HEADER_LINES = [
    '',
    `  ${f0[0]}  ${OC.bright}${name}${RESET}`,
    `  ${f0[1]}  ${OC.muted}${version}${RESET}`,
    `  ${f0[2]}`,
    `  ${f0[3]}`,
    `  ${f0[4]}`,
    `  ${f0[5]}`,
    `  ${f0[6]}`,
    '',
    `  ${OC.dimgfx}${'─'.repeat(54)}${RESET}`,
    '',
  ];

  for (const line of HEADER_LINES) stdout.write(line + '\n');

  const OCTO_ROW_COUNT = 7;
  // Lines printed after the last octo row within the header block
  let linesBelow = HEADER_LINES.length - (2 - 1) - OCTO_ROW_COUNT;

  let frameIdx = 0, animDir = 1;

  function redrawOcto() {
    cursor.up(linesBelow + OCTO_ROW_COUNT);
    const f = renderFrame(frameIdx);
    stdout.write(`  ${f[0]}  ${OC.bright}${name}${RESET}\n`);
    stdout.write(`  ${f[1]}  ${OC.muted}${version}${RESET}\n`);
    for (let r = 2; r < OCTO_ROW_COUNT; r++) stdout.write(`  ${f[r]}\n`);
    if (linesBelow > 0) stdout.write(`\x1b[${linesBelow}B`);
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
    { label: 'Loading ammunition',     delay: 350, ok: '✓ loaded' },
    { label: 'Scanning perimeter',     delay: 380, ok: '✓ clear'  },
  ];

  for (const check of checks) {
    const label = padLabel(OC.muted + check.label + RESET, 30 + OC.muted.length + RESET.length);
    let si_idx = 0;

    stdout.write(`  ${label} ${OC.muted}${SPIN[0]}${RESET}`);
    linesBelow++;

    const spinTimer = setInterval(() => {
      si_idx = (si_idx + 1) % SPIN.length;
      cursor.col1(); cursor.clr();
      stdout.write(`  ${label} ${OC.muted}${SPIN[si_idx]}${RESET}`);
    }, 90);

    await new Promise(r => setTimeout(r, check.delay));

    clearInterval(spinTimer);
    cursor.col1(); cursor.clr();
    stdout.write(`  ${label} ${OC.green}${check.ok}${RESET}\n`);
    await new Promise(r => setTimeout(r, 30));
  }

  clearInterval(animTimer);

  // Progress bar
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

  // Final static frame
  linesBelow += 2;
  frameIdx = 0;
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

// ── Help ──────────────────────────────────────────────────────────────────────

function showHelp() {
  console.clear();
  header();
  console.log(chalk.bold.white('USAGE'));
  console.log(`  ${chalk.cyan('node index.js')} ${chalk.yellow('[/option]')}\n`);

  console.log(chalk.bold.white('OPTIONS'));
  const opts = [
    ['/attack',     'Fight off an active zombie wave'],
    ['/restart',    'Rebuild the bunker after death'],
    ['/all',        'Show all sections'],
    ['/disk',       'Show disk usage only'],
    ['/ram',        'Show RAM usage only'],
    ['/cpu',        'Show CPU usage only'],
    ['/gpu',        'Show GPU usage only'],
    ['/io',         'Show Disk I/O only'],
    ['/ram /gpu',   'Combine multiple sections'],
    ['/clear',      'Clear the screen'],
    ['/help, /h',   'Show this help message'],
    ['/exit, exit',  'Quit the program'],
  ];
  for (const [flag, desc] of opts) {
    console.log(`  ${chalk.yellow(flag.padEnd(18))} ${chalk.white(desc)}`);
  }

  console.log('\n' + chalk.bold.white('EXAMPLES'));
  console.log(`  ${chalk.cyan('/all')}       Show everything`);
  console.log(`  ${chalk.cyan('/cpu')}       Show CPU only`);
  console.log(`  ${chalk.cyan('/disk')}      Show disk usage only`);
  console.log(`  ${chalk.cyan('/ram /gpu')}  Show RAM and GPU\n`);

  console.log(chalk.bold.white('COLOR GUIDE'));
  console.log(`  ${chalk.green('Green')}   0% – 60%   Normal`);
  console.log(`  ${chalk.yellow('Yellow')}  60% – 85%  Moderate`);
  console.log(`  ${chalk.red('Red')}     85%+       High usage\n`);
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

// ── Game state ────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const WAVE_DURATION_MS = 10000;
const WAVE_DAMAGE      = 50;
const WAVE_BREATHER_MS = 4000;
const FIRST_WAVE_MS    = 5000;

const game = {
  hp: 100,
  maxHp: 100,
  alive: true,
  atPrompt: false,
  animating: false,
  waveActive: false,
  waveStartedAt: 0,
  waveCount: 0,
  survivedWaves: 0,
  nextWaveAt: 0,
};

function hpBar() {
  const width = 10;
  const filled = Math.round((game.hp / game.maxHp) * width);
  const color = game.hp > 60 ? chalk.green : game.hp > 30 ? chalk.yellow : chalk.red;
  return chalk.dim('HP[') + color('█'.repeat(filled)) + chalk.gray('░'.repeat(width - filled)) + chalk.dim(`] ${String(game.hp).padStart(3)}`);
}

function zombieBar() {
  const width = 10;
  const remaining = Math.max(0, WAVE_DURATION_MS - (Date.now() - game.waveStartedAt));
  const elapsed = WAVE_DURATION_MS - remaining;
  const filled = Math.min(width, Math.round((elapsed / WAVE_DURATION_MS) * width));
  const secs = Math.ceil(remaining / 1000);
  return chalk.red('Z[') + chalk.bold.red('█'.repeat(filled)) + chalk.gray('░'.repeat(width - filled)) + chalk.red(`] ${String(secs).padStart(2)}s`);
}

function buildPrompt() {
  if (!game.alive) {
    return chalk.bold.red('[DEAD] ') + chalk.yellow('restart') + chalk.cyan('> ');
  }
  let p = hpBar() + ' ';
  if (game.waveActive) p += zombieBar() + ' ';
  p += chalk.bold.green('bunker') + chalk.cyan('> ');
  return p;
}

function showPrompt(rl) {
  rl.setPrompt(buildPrompt());
  rl.prompt();
  game.atPrompt = true;
}

function refreshPrompt(rl) {
  if (!game.atPrompt || game.animating) return;
  const buffered = rl.line || '';
  process.stdout.write('\r\x1b[2K');
  rl.setPrompt(buildPrompt());
  rl.prompt(true);
  if (buffered) process.stdout.write(buffered);
}

function printAbovePrompt(rl, text) {
  const buffered = rl.line || '';
  process.stdout.write('\r\x1b[2K');
  process.stdout.write(text + '\n');
  rl.setPrompt(buildPrompt());
  rl.prompt(true);
  if (buffered) process.stdout.write(buffered);
}

function startWave(rl) {
  game.waveActive = true;
  game.waveStartedAt = Date.now();
  game.waveCount++;
  const msg =
    '\n' +
    chalk.bold.red('  ⚠  WARNING: ') + chalk.red(`Zombie wave #${game.waveCount} approaching!`) + '\n' +
    chalk.dim('     Type ') + chalk.yellow('/attack') + chalk.dim(' before the countdown hits zero.');
  printAbovePrompt(rl, msg);
}

async function playArrivalAnimation(rl) {
  const frames = [
    [
      '',
      chalk.red('       r   r   r      r   r   r'),
      chalk.dim('     ...shambling at the gates...'),
    ],
    [
      '',
      chalk.bold.red('     GRRROOOAAAAAAAN...'),
      chalk.red('     /¯\\  /¯\\  /¯\\  /¯\\'),
      chalk.red('     |o|  |o|  |o|  |o|'),
      chalk.red('     /_\\  /_\\  /_\\  /_\\'),
    ],
    [
      '',
      chalk.bold.red('     *** BANG! BANG! BANG! ***'),
      chalk.red('     |o||o||o||o|') + chalk.bold.red('  THE HATCH BUCKLES'),
    ],
    [
      '',
      chalk.bold.red('     >>>  BREACH  <<<  ') + chalk.red('zombies pour in!'),
      chalk.bold.red('     ✗ ✗ ✗ ✗ ✗ ✗ ✗ ✗'),
    ],
  ];
  for (const f of frames) {
    printAbovePrompt(rl, f.join('\n'));
    await sleep(550);
  }
}

async function playDeathAnimation(rl) {
  const fades = [
    chalk.red('  ...your vision blurs...'),
    chalk.dim('  ...the bunker grows cold...'),
    chalk.gray('  ...silence...'),
  ];
  for (const line of fades) {
    printAbovePrompt(rl, line);
    await sleep(450);
  }
  await sleep(350);

  console.clear();
  console.log();
  console.log(chalk.bold.red('  ██╗   ██╗ ██████╗ ██╗   ██╗    ██████╗ ██╗███████╗██████╗ '));
  console.log(chalk.bold.red('  ╚██╗ ██╔╝██╔═══██╗██║   ██║    ██╔══██╗██║██╔════╝██╔══██╗'));
  console.log(chalk.bold.red('   ╚████╔╝ ██║   ██║██║   ██║    ██║  ██║██║█████╗  ██║  ██║'));
  console.log(chalk.bold.red('    ╚██╔╝  ██║   ██║██║   ██║    ██║  ██║██║██╔══╝  ██║  ██║'));
  console.log(chalk.bold.red('     ██║   ╚██████╔╝╚██████╔╝    ██████╔╝██║███████╗██████╔╝'));
  console.log(chalk.bold.red('     ╚═╝    ╚═════╝  ╚═════╝     ╚═════╝ ╚═╝╚══════╝╚═════╝ '));
  console.log();
  console.log(chalk.dim(`  The bunker falls silent. Waves survived: `) + chalk.bold.white(String(game.survivedWaves)));
  console.log();
  console.log(chalk.dim('  Type ') + chalk.yellow('/restart') + chalk.dim(' to rebuild the bunker, or ') + chalk.yellow('/exit') + chalk.dim(' to quit.'));
  console.log();
}

async function waveArrives(rl) {
  game.waveActive = false;
  game.animating = true;

  await playArrivalAnimation(rl);

  game.hp = Math.max(0, game.hp - WAVE_DAMAGE);
  printAbovePrompt(rl,
    chalk.bold.red(`  ✗ You took ${WAVE_DAMAGE} damage!  `) +
    chalk.dim(`HP: ${game.hp}/${game.maxHp}`)
  );

  if (game.hp <= 0) {
    await playDeathAnimation(rl);
    game.alive = false;
  }

  game.animating = false;
  game.nextWaveAt = Date.now() + WAVE_BREATHER_MS;
  refreshPrompt(rl);
}

function gameTick(rl) {
  if (!game.alive || game.animating) return;
  if (!game.atPrompt) return; // pause the clock during command execution

  if (!game.waveActive && Date.now() >= game.nextWaveAt) {
    startWave(rl);
    return;
  }
  if (game.waveActive) {
    const remaining = WAVE_DURATION_MS - (Date.now() - game.waveStartedAt);
    if (remaining <= 0) {
      waveArrives(rl);
      return;
    }
    refreshPrompt(rl);
  }
}

function attackZombies() {
  if (!game.waveActive) {
    console.log(chalk.dim('  The perimeter is quiet. No zombies in sight.\n'));
    return;
  }
  game.waveActive = false;
  game.survivedWaves++;
  game.nextWaveAt = Date.now() + WAVE_BREATHER_MS;
  console.log(
    chalk.bold.green('  ✓ Wave repelled! ') +
    chalk.dim(`The bunker holds. (waves survived: ${game.survivedWaves})`) + '\n'
  );
}

function restartBunker() {
  game.hp = game.maxHp;
  game.alive = true;
  game.waveActive = false;
  game.waveCount = 0;
  game.survivedWaves = 0;
  game.animating = false;
  game.nextWaveAt = Date.now() + FIRST_WAVE_MS;
  console.clear();
  header();
  console.log(chalk.bold.green('  ✓ Bunker rebuilt. ') + chalk.dim('Health restored. Stand by for the next wave...\n'));
}

// ── Command handler ───────────────────────────────────────────────────────────

async function runCommand(input) {
  const args = input.trim().toLowerCase().split(/\s+/).filter(Boolean).map(a => a.replace(/^\//, ''));

  if (args.length === 0) return;

  if (args.includes('help') || args.includes('h') || args.includes('?')) {
    showHelp();
    return;
  }

  if (args.includes('clear')) {
    console.clear();
    header();
    return;
  }

  if (args.includes('restart')) {
    if (game.alive) {
      console.log(chalk.dim('  Bunker is already operational.\n'));
    } else {
      restartBunker();
    }
    return;
  }

  if (!game.alive) {
    console.log(
      chalk.dim('  You are dead. Type ') +
      chalk.yellow('/restart') +
      chalk.dim(' to rebuild the bunker.\n')
    );
    return;
  }

  if (args.includes('attack')) {
    attackZombies();
    return;
  }

  const known = ['disk', 'ram', 'cpu', 'gpu', 'io', 'all', 'clear', 'help', 'h', '?', 'exit', 'quit', 'attack', 'restart'];
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

// ── Interactive prompt ────────────────────────────────────────────────────────

function startPrompt() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.bold.green('bunker') + chalk.cyan('> '),
  });

  game.nextWaveAt = Date.now() + FIRST_WAVE_MS;
  showPrompt(rl);

  const tickTimer = setInterval(() => gameTick(rl), 500);

  rl.on('line', async (line) => {
    game.atPrompt = false;
    const input = line.trim();

    const cmd = input.toLowerCase();
    if (cmd === '/exit' || cmd === '/quit' || cmd === 'exit' || cmd === 'quit') {
      clearInterval(tickTimer);
      console.log(chalk.dim('\n  Goodbye!\n'));
      process.exit(0);
    }

    try {
      await runCommand(input);
    } catch (err) {
      console.error(chalk.red('  Error: ') + err.message + '\n');
    }

    showPrompt(rl);
  });

  rl.on('close', () => {
    clearInterval(tickTimer);
    process.exit(0);
  });
}

// ── Entry point ───────────────────────────────────────────────────────────────

await bootScreen();
startPrompt();
