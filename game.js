import chalk from 'chalk';
import * as zombies from './managers/zombieManager.js';
import * as chores  from './managers/choreManager.js';
import * as events  from './managers/eventManager.js';
import * as npcs    from './managers/npcManager.js';
import * as chat    from './managers/chatManager.js';
import { weather } from './managers/eventManager.js';

// ── Dependency injection ──────────────────────────────────────────────────────

let _header = () => {};
export function initGame({ header }) {
  _header = header;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Constants ─────────────────────────────────────────────────────────────────

export const POWER_SAVE_MS       = 60 * 1000;
export const SOLAR_GAIN_PER_TICK = 0.0625; // ~7.5% per minute (slows drain during day)
export const BASE_DRAIN_PER_TICK = 10 / 60; // 10% per 30s (60 ticks × 500ms)

// ── Game state ────────────────────────────────────────────────────────────────

export const game = {
  gameMode        : false,
  hp              : 100,
  maxHp           : 100,
  alive           : true,
  atPrompt        : false,
  animating       : false,
  // Waves (managed by zombieManager)
  waveActive      : false,
  waveStartedAt   : 0,
  waveDuration    : 10000,
  waveCount       : 0,
  survivedWaves   : 0,
  nextWaveAt      : 0,
  currentZombieType: null,
  hitsLeft        : 0,
  // Power
  battery         : 50,
  maxBattery      : 100,
  isNight         : false,
  powerSaveActive : false,
  powerSaveEndsAt : 0,
  blackout        : false,
};

// ── Prompt widgets ────────────────────────────────────────────────────────────


function batteryBar() {
  const width  = 10;
  const pct    = game.battery;
  const filled = Math.min(width, Math.round((pct / game.maxBattery) * width));
  const color  = pct > 70 ? chalk.green : pct > 30 ? chalk.rgb(255, 160, 0) : chalk.red;
  return chalk.dim('BATTERY[') + color('█'.repeat(filled)) + chalk.gray('░'.repeat(width - filled)) + color(`] ${String(Math.round(pct)).padStart(3)}`);
}

export function buildPrompt() {
  if (!game.gameMode) {
    return chalk.bold.green('bunker') + chalk.cyan('> ');
  }
  if (!game.alive) {
    return chalk.bold.red('[DEAD] ') + chalk.yellow('restart') + chalk.cyan('> ');
  }
  if (chat.isActive()) {
    return chalk.bold.magenta(chat.currentNpc()?.name ?? 'chat') + chalk.cyan(' > ');
  }
  let p = batteryBar() + ' ';
  if (game.blackout) {
    p += chalk.bold.red('▓') + ' ' + chalk.bold.red('[DARK] ');
  } else {
    p += (game.isNight ? chalk.blue('☽') : chalk.yellow('☀')) + ' ';
  }
  if (game.powerSaveActive) {
    const secs = Math.max(0, Math.ceil((game.powerSaveEndsAt - Date.now()) / 1000));
    p += chalk.dim(`[save ${secs}s] `);
  }
  if (npcs.npc.state === 'atDoor')  p += chalk.magenta('[visitor] ');
  if (npcs.npc.state === 'staying') p += chalk.yellow('[guest] ');
  if (game.waveActive) p += zombies.zombieBarText() + ' ';
  p += (game.blackout ? chalk.bold.red('bunker') : chalk.bold.green('bunker')) + chalk.cyan('> ');
  return p;
}

// ── Prompt helpers ────────────────────────────────────────────────────────────

let _lastPrompt = '';

export function showPrompt(rl) {
  _lastPrompt = buildPrompt();
  rl.setPrompt(_lastPrompt);
  rl.prompt();
  game.atPrompt = true;
}

export function refreshPrompt(rl) {
  if (!game.atPrompt || game.animating) return;
  const next = buildPrompt();
  if (next === _lastPrompt) return;
  _lastPrompt = next;
  process.stdout.write('\r\x1b[2K');
  rl.setPrompt(next);
  rl.prompt(true);
  // rl.prompt(true) calls _refreshLine() which already redraws prompt + rl.line
}

export function printAbovePrompt(rl, text) {
  process.stdout.write('\r\x1b[2K');
  process.stdout.write(text + '\n');
  _lastPrompt = buildPrompt();
  rl.setPrompt(_lastPrompt);
  rl.prompt(true);
  // rl.prompt(true) calls _refreshLine() which already redraws prompt + rl.line
}

// ── Death ─────────────────────────────────────────────────────────────────────

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
  const youDied = [
    '██╗   ██╗ ██████╗ ██╗   ██╗    ██████╗ ██╗███████╗██████╗ ',
    '╚██╗ ██╔╝██╔═══██╗██║   ██║    ██╔══██╗██║██╔════╝██╔══██╗',
    ' ╚████╔╝ ██║   ██║██║   ██║    ██║  ██║██║█████╗  ██║  ██║',
    '  ╚██╔╝  ██║   ██║██║   ██║    ██║  ██║██║██╔══╝  ██║  ██║',
    '   ██║   ╚██████╔╝╚██████╔╝    ██████╔╝██║███████╗██████╔╝',
    '   ╚═╝    ╚═════╝  ╚═════╝     ╚═════╝ ╚═╝╚══════╝╚═════╝ ',
  ];
  for (const line of youDied) console.log('  ' + chalk.bold.red(line));
  console.log();
  console.log(chalk.dim('  The bunker falls silent.  Waves survived: ') + chalk.bold.white(String(game.survivedWaves)));
  console.log();
  console.log(chalk.dim('  Type ') + chalk.yellow('/restart') + chalk.dim(' to rebuild, or ') + chalk.yellow('/exit') + chalk.dim(' to quit.'));
  console.log();
}

// ── Tick ──────────────────────────────────────────────────────────────────────

function checkDeath(rl) {
  if (game.hp <= 0 && game.alive) {
    game.alive = false;
    playDeathAnimation(rl);
    return true;
  }
  return false;
}

export function gameTick(rl) {
  if (!game.gameMode) return;
  if (!game.alive || game.animating) return;

  // ── Physics: always runs (not gated by atPrompt) ──────────────────────────

  // Power-save auto-expiry
  if (game.powerSaveActive && Date.now() >= game.powerSaveEndsAt) {
    game.powerSaveActive = false;
    if (game.atPrompt) printAbovePrompt(rl, chalk.bold.green('  ⚡ Power-save ended. ') + chalk.dim('Systems resume.'));
  }

  // Baseline drain — always on unless power-save is active
  if (!game.powerSaveActive) {
    game.battery = Math.max(0, game.battery - BASE_DRAIN_PER_TICK);
  }

  // Solar recharge during day, modulated by weather
  if (!game.isNight && game.battery < game.maxBattery) {
    game.battery = Math.min(
      game.maxBattery,
      game.battery + SOLAR_GAIN_PER_TICK * weather.solarMultiplier
    );
  }

  // Blackout transitions
  const nowBlackout = game.battery <= 0;
  if (nowBlackout && !game.blackout) {
    game.blackout = true;
    if (game.atPrompt) printAbovePrompt(rl,
      '\n' +
      chalk.bold.red('  ✖  POWER FAILURE. ') + chalk.red('The lights go out.\n') +
      chalk.red('  The hatch is unsecured. Guards are offline.\n') +
      chalk.dim('  Zombies can breach directly. Strangers will walk in.\n') +
      chalk.dim('  If it gets desperate — type ') + chalk.bold.red('/detonate') + chalk.dim(' to blow the bunker.')
    );
  } else if (!nowBlackout && game.blackout) {
    game.blackout = false;
    if (game.atPrompt) printAbovePrompt(rl, chalk.bold.green('  ⚡ Power restored. ') + chalk.dim('Lights on. Guards back online.'));
  }

  // ── Events: only when idle at prompt ─────────────────────────────────────

  if (!game.atPrompt) { refreshPrompt(rl); return; }

  chores.choreTick(rl);
  if (checkDeath(rl)) return;

  events.eventTick(rl);
  npcs.npcTick(rl);
  if (checkDeath(rl)) return;

  zombies.zombieTick(rl, playDeathAnimation);
  if (!game.alive) return;

  refreshPrompt(rl);
}

// ── Game control ──────────────────────────────────────────────────────────────

export function restartBunker() {
  resetGameState();
  console.clear();
  _header();
  console.log(
    chalk.bold.green('  ✓ Bunker rebuilt. ') +
    chalk.dim('Health restored. Battery at 50%. A quieter day begins.\n')
  );
}

export function startGame() {
  resetGameState();
  console.log(
    chalk.bold.green('  ✓ Bunker sealed. ') +
    chalk.dim('Battery: 50%. Zombies stir somewhere in the next ten minutes. Take a breath.\n')
  );
}

export function togglePowerSave() {
  if (game.powerSaveActive) {
    const secs = Math.max(0, Math.ceil((game.powerSaveEndsAt - Date.now()) / 1000));
    console.log(chalk.dim(`  ⚡ Power-save already running — ${secs}s remaining.\n`));
    return;
  }
  game.powerSaveActive = true;
  game.powerSaveEndsAt = Date.now() + POWER_SAVE_MS;
  console.log(
    chalk.bold.yellow('  ⚡ Power-save ON for 60s. ') +
    chalk.dim('Chores paused, wave countdown paused, auto-defence offline.\n')
  );
}

export async function detonate(rl) {
  if (!game.blackout) {
    console.log(chalk.dim('  The bunker still has power. Detonation is a last resort.\n'));
    return;
  }

  const countdown = ['  3...', '  2...', '  1...'];
  for (const c of countdown) {
    printAbovePrompt(rl, chalk.bold.red(c));
    await sleep(700);
  }

  const survived = Math.random() < 0.5;

  if (survived) {
    const messages = [
      chalk.bold.red('  ✖  DETONATION.'),
      chalk.red('  The bunker tears apart in a ball of fire.'),
      chalk.dim('  ...dust... ringing... silence...'),
      chalk.bold.green('  You crawl out through the rubble, coughing. Alive.'),
      chalk.dim('  A new shelter. A new start. The battery reads 50%.'),
    ];
    for (const m of messages) {
      printAbovePrompt(rl, m);
      await sleep(600);
    }
    await sleep(400);
    resetGameState();
    console.clear();
    _header();
    console.log(chalk.bold.green('  ✓ Against the odds — you made it. New bunker. Fresh start.\n'));
  } else {
    const messages = [
      chalk.bold.red('  ✖  DETONATION.'),
      chalk.red('  The bunker tears apart in a ball of fire.'),
      chalk.dim('  ...the smoke takes you...'),
      chalk.gray('  ...silence...'),
    ];
    for (const m of messages) {
      printAbovePrompt(rl, m);
      await sleep(600);
    }
    game.alive = false;
    await playDeathAnimation(rl);
  }
}

function resetGameState() {
  game.gameMode        = true;
  game.hp              = game.maxHp;
  game.alive           = true;
  game.animating       = false;
  game.battery         = 50;
  game.powerSaveActive = false;
  game.powerSaveEndsAt = 0;
  game.isNight         = false;
  game.blackout        = false;

  zombies.resetWaves();
  chores.reset();
  events.reset();
  npcs.reset();
}
