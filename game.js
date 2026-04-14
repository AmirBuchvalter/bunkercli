import chalk from 'chalk';

// ── Dependency injection (header fn from index.js) ────────────────────────────

let _header = () => {};
export function initGame({ header }) {
  _header = header;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Zombie types & rules ──────────────────────────────────────────────────────

const ZOMBIE_TYPES = {
  shambler: {
    id          : 'shambler',
    name        : 'Shamblers',
    emoji       : 'r r r r r',
    description : 'Slow rotting undead — easy to repel',
    duration    : 12000,
    damage      : 20,
    hitsRequired: 1,
    label       : (s) => chalk.red(s),
  },
  runner: {
    id          : 'runner',
    name        : 'Runners',
    emoji       : 'rrr rrr rrr',
    description : 'Fast and frenzied — act quickly!',
    duration    : 7000,
    damage      : 30,
    hitsRequired: 1,
    label       : (s) => chalk.bold.red(s),
  },
  brute: {
    id          : 'brute',
    name        : 'Brute',
    emoji       : ' B R U T E ',
    description : 'Armoured giant — hit twice to bring it down',
    duration    : 14000,
    damage      : 40,
    hitsRequired: 2,
    label       : (s) => chalk.magenta(s),
  },
  horde: {
    id          : 'horde',
    name        : 'Horde',
    emoji       : 'rrrrrrrrrrr',
    description : 'Overwhelming numbers — three attacks needed',
    duration    : 10000,
    damage      : 60,
    hitsRequired: 3,
    label       : (s) => chalk.bold.yellow(s),
  },
};

/** Select a zombie type based on wave number. */
function pickZombieType(waveNum) {
  if (waveNum <= 2) return ZOMBIE_TYPES.shambler;
  if (waveNum <= 4) {
    return Math.random() < 0.6 ? ZOMBIE_TYPES.shambler : ZOMBIE_TYPES.runner;
  }
  if (waveNum <= 6) {
    return Math.random() < 0.5 ? ZOMBIE_TYPES.runner : ZOMBIE_TYPES.brute;
  }
  // wave 7+: full mix
  const r = Math.random();
  if (r < 0.25) return ZOMBIE_TYPES.shambler;
  if (r < 0.55) return ZOMBIE_TYPES.runner;
  if (r < 0.80) return ZOMBIE_TYPES.brute;
  return ZOMBIE_TYPES.horde;
}

// ── Game constants ────────────────────────────────────────────────────────────

export const WAVE_BREATHER_MS = 60000;   // 1 minute between waves
export const FIRST_WAVE_MS    = 60000;   // 1 minute before first wave

// ── Power system constants ───────────────────────────────────────────────────
export const ATTACK_COST       = 20;    // % battery per manual attack
export const WATERCYCLE_COST   = 20;    // % battery per watercycle run
export const AUTO_DEFENCE_COST = 10;    // % battery per auto-defence hit (night)
export const WATERCYCLE_MS         = 90000;    // 90s normal watercycle interval
export const WATERCYCLE_MS_SAVE    = 180000;   // 180s in power-save mode
export const SOLAR_GAIN_PER_TICK   = 0.15;     // % battery per 500ms tick during day
export const DEHYDRATION_HP_LOSS   = 15;       // HP lost when watercycle can't run

// ── Game state ────────────────────────────────────────────────────────────────

export const game = {
  gameMode        : false,
  hp              : 100,
  maxHp           : 100,
  alive           : true,
  atPrompt        : false,
  animating       : false,
  waveActive      : false,
  waveStartedAt   : 0,
  waveDuration    : 10000,
  waveCount       : 0,
  survivedWaves   : 0,
  nextWaveAt      : 0,
  currentZombieType: null,
  hitsLeft        : 0,
  // Power
  battery         : 40,
  maxBattery      : 100,
  isNight         : false,
  powerSave       : false,
  nextWatercycleAt: 0,
};

// ── Prompt widgets ────────────────────────────────────────────────────────────

export function hpBar() {
  const width  = 10;
  const filled = Math.round((game.hp / game.maxHp) * width);
  const color  = game.hp > 60 ? chalk.green : game.hp > 30 ? chalk.yellow : chalk.red;
  return chalk.dim('HP[') + color('█'.repeat(filled)) + chalk.gray('░'.repeat(width - filled)) + chalk.dim(`] ${String(game.hp).padStart(3)}`);
}

export function zombieBar() {
  const width     = 10;
  const remaining = Math.max(0, game.waveDuration - (Date.now() - game.waveStartedAt));
  const elapsed   = game.waveDuration - remaining;
  const filled    = Math.min(width, Math.round((elapsed / game.waveDuration) * width));
  const secs      = Math.ceil(remaining / 1000);
  const zLabel    = game.currentZombieType?.label ?? chalk.red;
  const hitInfo   = game.hitsLeft > 1 ? chalk.dim(` x${game.hitsLeft}`) : '';
  return zLabel('Z[') + chalk.bold.red('█'.repeat(filled)) + chalk.gray('░'.repeat(width - filled)) + zLabel(`] ${String(secs).padStart(2)}s`) + hitInfo;
}

export function batteryBar() {
  const width  = 10;
  const filled = Math.min(width, Math.round((game.battery / game.maxBattery) * width));
  const color  = game.battery > 60 ? chalk.green : game.battery > 25 ? chalk.yellow : chalk.red;
  return chalk.dim('BAT[') + color('█'.repeat(filled)) + chalk.gray('░'.repeat(width - filled)) + chalk.dim(`] ${String(Math.round(game.battery)).padStart(3)}`);
}

export function buildPrompt() {
  if (!game.gameMode) {
    return chalk.bold.green('bunker') + chalk.cyan('> ');
  }
  if (!game.alive) {
    return chalk.bold.red('[DEAD] ') + chalk.yellow('restart') + chalk.cyan('> ');
  }
  let p = hpBar() + ' ';
  p += (game.isNight ? chalk.blue('☽') : chalk.yellow('☀')) + ' ';
  if (game.powerSave) p += chalk.dim('[save] ');
  if (game.waveActive) p += zombieBar() + ' ';
  p += chalk.bold.green('bunker') + chalk.cyan('> ');
  return p;
}

// ── Prompt helpers ────────────────────────────────────────────────────────────

export function showPrompt(rl) {
  _lastPrompt = buildPrompt();
  rl.setPrompt(_lastPrompt);
  rl.prompt();
  game.atPrompt = true;
}

let _lastPrompt = '';
export function refreshPrompt(rl) {
  if (!game.atPrompt || game.animating) return;
  const next = buildPrompt();
  if (next === _lastPrompt) return;    // nothing changed — skip redraw to avoid flicker
  _lastPrompt = next;
  const buffered = rl.line || '';
  process.stdout.write('\r\x1b[2K');
  rl.setPrompt(next);
  rl.prompt(true);
  if (buffered) process.stdout.write(buffered);
}

export function printAbovePrompt(rl, text) {
  const buffered = rl.line || '';
  process.stdout.write('\r\x1b[2K');
  process.stdout.write(text + '\n');
  _lastPrompt = buildPrompt();
  rl.setPrompt(_lastPrompt);
  rl.prompt(true);
  if (buffered) process.stdout.write(buffered);
}

// ── Wave logic ────────────────────────────────────────────────────────────────

export function startWave(rl) {
  const zType = pickZombieType(game.waveCount + 1);
  game.waveActive       = true;
  game.waveStartedAt    = Date.now();
  game.waveDuration     = zType.duration;
  game.waveCount++;
  game.currentZombieType = zType;
  game.hitsLeft          = zType.hitsRequired;

  const zl  = zType.label;
  const hits = zType.hitsRequired > 1
    ? chalk.dim(` (${zType.hitsRequired} attacks needed)`)
    : '';

  const msg =
    '\n' +
    chalk.bold.red('  ⚠  WAVE #') + chalk.bold.red(String(game.waveCount)) +
    chalk.dim('  ') + zl(zType.name) + chalk.dim(' — ') + chalk.dim(zType.description) + hits + '\n' +
    chalk.dim('     ') + zl(zType.emoji) + '\n' +
    chalk.dim('     Type ') + chalk.yellow('/attack') + chalk.dim(' before the countdown hits zero.');
  printAbovePrompt(rl, msg);
}

export async function playArrivalAnimation(rl) {
  const zType = game.currentZombieType ?? ZOMBIE_TYPES.shambler;
  const zl    = zType.label;
  const frames = [
    [
      '',
      zl(`     ${zType.emoji}`),
      chalk.dim('     ...converging on the bunker...'),
    ],
    [
      '',
      chalk.bold.red(`     GRRRAAAAH! — ${zType.name.toUpperCase()}`),
      zl('     /¯\\  /¯\\  /¯\\  /¯\\'),
      zl('     |o|  |o|  |o|  |o|'),
      zl('     /_\\  /_\\  /_\\  /_\\'),
    ],
    [
      '',
      chalk.bold.red('     *** BANG! BANG! BANG! ***'),
      zl('     |o||o||o||o|') + chalk.bold.red('  THE HATCH BUCKLES'),
    ],
    [
      '',
      chalk.bold.red('     >>>  BREACH  <<<  ') + zl(`${zType.name} pour in!`),
      chalk.bold.red('     ✗ ✗ ✗ ✗ ✗ ✗ ✗ ✗'),
    ],
  ];
  for (const f of frames) {
    printAbovePrompt(rl, f.join('\n'));
    await sleep(550);
  }
}

export async function playDeathAnimation(rl) {
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
  const skull = [
    "   .-\"\"\"-.   ",
    "  /       \\  ",
    " |  O   O  | ",
    " |    ^    | ",
    "  \\ \\___/ /  ",
    "   '-----'   ",
  ];
  const youDied = [
    '██╗   ██╗ ██████╗ ██╗   ██╗    ██████╗ ██╗███████╗██████╗ ',
    '╚██╗ ██╔╝██╔═══██╗██║   ██║    ██╔══██╗██║██╔════╝██╔══██╗',
    ' ╚████╔╝ ██║   ██║██║   ██║    ██║  ██║██║█████╗  ██║  ██║',
    '  ╚██╔╝  ██║   ██║██║   ██║    ██║  ██║██║██╔══╝  ██║  ██║',
    '   ██║   ╚██████╔╝╚██████╔╝    ██████╔╝██║███████╗██████╔╝',
    '   ╚═╝    ╚═════╝  ╚═════╝     ╚═════╝ ╚═╝╚══════╝╚═════╝ ',
  ];
  for (let i = 0; i < youDied.length; i++) {
    console.log('  ' + chalk.bold.white(skull[i]) + '  ' + chalk.bold.red(youDied[i]));
  }
  console.log();
  console.log(chalk.dim('  The bunker falls silent.  Waves survived: ') + chalk.bold.white(String(game.survivedWaves)));
  console.log();
  console.log(chalk.dim('  Type ') + chalk.yellow('/restart') + chalk.dim(' to rebuild, or ') + chalk.yellow('/exit') + chalk.dim(' to quit.'));
  console.log();
}

export async function waveArrives(rl) {
  game.waveActive = false;
  game.animating  = true;

  await playArrivalAnimation(rl);

  const dmg = game.currentZombieType?.damage ?? 50;
  game.hp = Math.max(0, game.hp - dmg);
  printAbovePrompt(rl,
    chalk.bold.red(`  ✗ You took ${dmg} damage!  `) +
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

// ── Tick ──────────────────────────────────────────────────────────────────────

function runWatercycle(rl) {
  if (game.battery >= WATERCYCLE_COST) {
    game.battery -= WATERCYCLE_COST;
    printAbovePrompt(rl, chalk.cyan('  ♺ Watercycle completed. ') + chalk.dim(`-${WATERCYCLE_COST}% battery → ${Math.round(game.battery)}%.`));
  } else {
    game.hp = Math.max(0, game.hp - DEHYDRATION_HP_LOSS);
    printAbovePrompt(rl,
      chalk.red('  ⚠ Watercycle failed — insufficient power! ') +
      chalk.dim(`Dehydration: -${DEHYDRATION_HP_LOSS} HP (${game.hp}/${game.maxHp}).`)
    );
    if (game.hp <= 0) {
      game.alive = false;
      playDeathAnimation(rl);
    }
  }
  game.nextWatercycleAt = Date.now() + (game.powerSave ? WATERCYCLE_MS_SAVE : WATERCYCLE_MS);
}

function tryAutoDefence(rl) {
  // At night with auto-defence available (not in power-save), drain battery to kill zombies.
  if (!game.isNight || game.powerSave || !game.waveActive) return;
  while (game.hitsLeft > 0 && game.battery >= AUTO_DEFENCE_COST) {
    game.battery -= AUTO_DEFENCE_COST;
    game.hitsLeft--;
  }
  if (game.hitsLeft === 0) {
    game.waveActive = false;
    game.survivedWaves++;
    game.nextWaveAt = Date.now() + WAVE_BREATHER_MS;
    printAbovePrompt(rl,
      chalk.bold.green('  ◎ Auto-defence engaged! ') +
      chalk.dim(`Wave repelled. Battery: ${Math.round(game.battery)}%. (waves survived: ${game.survivedWaves})`)
    );
  }
}

export function gameTick(rl) {
  if (!game.gameMode) return;
  if (!game.alive || game.animating) return;
  if (!game.atPrompt) return;

  // Solar recharge during day
  if (!game.isNight && game.battery < game.maxBattery) {
    game.battery = Math.min(game.maxBattery, game.battery + SOLAR_GAIN_PER_TICK);
  }

  // Watercycle loop
  if (Date.now() >= game.nextWatercycleAt) {
    runWatercycle(rl);
    if (!game.alive) return;
  }

  if (!game.waveActive && Date.now() >= game.nextWaveAt) {
    startWave(rl);
    return;
  }
  if (game.waveActive) {
    tryAutoDefence(rl);
    if (!game.waveActive) { refreshPrompt(rl); return; }
    const remaining = game.waveDuration - (Date.now() - game.waveStartedAt);
    if (remaining <= 0) {
      waveArrives(rl);
      return;
    }
  }
  refreshPrompt(rl);
}

// ── Player actions ────────────────────────────────────────────────────────────

export function attackZombies() {
  if (!game.waveActive) {
    console.log(chalk.dim('  The perimeter is quiet. No zombies in sight.\n'));
    return;
  }
  if (game.battery < ATTACK_COST) {
    console.log(
      chalk.red(`  ✗ Insufficient battery to attack (need ${ATTACK_COST}%, have ${Math.round(game.battery)}%). `) +
      chalk.dim('Brace for the hit or wait for solar recharge.\n')
    );
    return;
  }

  game.battery -= ATTACK_COST;
  game.hitsLeft--;

  if (game.hitsLeft > 0) {
    const zl = game.currentZombieType?.label ?? chalk.red;
    console.log(
      chalk.yellow(`  ✓ Hit landed! `) +
      zl(game.currentZombieType?.name ?? 'Zombies') +
      chalk.dim(` still fighting — ${game.hitsLeft} more attack${game.hitsLeft > 1 ? 's' : ''} needed!\n`)
    );
    return;
  }

  game.waveActive = false;
  game.survivedWaves++;
  game.nextWaveAt = Date.now() + WAVE_BREATHER_MS;
  console.log(
    chalk.bold.green('  ✓ Wave repelled! ') +
    chalk.dim(`The bunker holds. Battery: ${Math.round(game.battery)}%. (waves survived: ${game.survivedWaves})`) + '\n'
  );
}

function resetGameState() {
  game.gameMode         = true;
  game.hp               = game.maxHp;
  game.alive            = true;
  game.waveActive       = false;
  game.waveCount        = 0;
  game.survivedWaves    = 0;
  game.animating        = false;
  game.currentZombieType = null;
  game.hitsLeft         = 0;
  game.nextWaveAt       = Date.now() + FIRST_WAVE_MS;
  game.battery          = 40;
  game.powerSave        = false;
  game.isNight          = false;
  game.nextWatercycleAt = Date.now() + WATERCYCLE_MS;
}

export function restartBunker() {
  resetGameState();
  console.clear();
  _header();
  console.log(chalk.bold.green('  ✓ Bunker rebuilt. ') + chalk.dim('Health restored. Battery at 40%. Stand by for the next wave...\n'));
}

export function startGame() {
  resetGameState();
  console.log(
    chalk.bold.red('  ⚔  Game session started. ') +
    chalk.dim(`Battery: 40%.  First wave in ${FIRST_WAVE_MS / 1000}s. Type `) +
    chalk.yellow('/attack') +
    chalk.dim(', ') + chalk.yellow('/watercycle') +
    chalk.dim(', or ') + chalk.yellow('/powersave') +
    chalk.dim(' to manage the bunker.\n')
  );
}

export function togglePowerSave() {
  game.powerSave = !game.powerSave;
  if (game.powerSave) {
    console.log(
      chalk.bold.yellow('  ⚡ Power-saving mode ON. ') +
      chalk.dim('Watercycle interval extended; auto-defence disabled.\n')
    );
  } else {
    console.log(
      chalk.bold.green('  ⚡ Power-saving mode OFF. ') +
      chalk.dim('Full systems online.\n')
    );
  }
  game.nextWatercycleAt = Date.now() + (game.powerSave ? WATERCYCLE_MS_SAVE : WATERCYCLE_MS);
}

export function manualWatercycle() {
  if (game.battery < WATERCYCLE_COST) {
    console.log(chalk.red(`  ✗ Not enough battery for watercycle (need ${WATERCYCLE_COST}%).\n`));
    return;
  }
  game.battery -= WATERCYCLE_COST;
  game.nextWatercycleAt = Date.now() + (game.powerSave ? WATERCYCLE_MS_SAVE : WATERCYCLE_MS);
  console.log(chalk.cyan(`  ♺ Watercycle run manually. `) + chalk.dim(`-${WATERCYCLE_COST}% battery → ${Math.round(game.battery)}%.\n`));
}
