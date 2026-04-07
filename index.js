#!/usr/bin/env node
import si from 'systeminformation';
import chalk from 'chalk';
import readline from 'readline';

const BAR_WIDTH = 30;

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
    process.stdout.write('\r\x1b[2K'); // clear the spinner line
  };
}

// ── Command handler ───────────────────────────────────────────────────────────

async function runCommand(input) {
  // Strip leading slash so /disk and disk both work
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

  const known = ['disk', 'ram', 'cpu', 'gpu', 'io', 'all', 'clear', 'help', 'h', '?', 'exit', 'quit'];
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

  console.clear();
  header();
  console.log(chalk.dim('  Type a command to get started. Type /help for options, /exit to quit.\n'));

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();

    const cmd = input.toLowerCase();
    if (cmd === '/exit' || cmd === '/quit' || cmd === 'exit' || cmd === 'quit') {
      console.log(chalk.dim('\n  Goodbye!\n'));
      process.exit(0);
    }

    try {
      await runCommand(input);
    } catch (err) {
      console.error(chalk.red('  Error: ') + err.message + '\n');
    }

    rl.prompt();
  });

  rl.on('close', () => process.exit(0));
}

startPrompt();
