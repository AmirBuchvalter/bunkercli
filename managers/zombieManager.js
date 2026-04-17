import chalk from 'chalk';
import { game, printAbovePrompt, sleep } from '../game.js';

const TICK_MS = 500;

const ZOMBIE_TYPES = {
  shambler: {
    id: 'shambler', name: 'Shamblers',
    art: 'r r r r r',
    description: 'Slow rotting undead — easy to repel',
    duration: 18000, damage: 15, hitsRequired: 1,
    label: (s) => chalk.red(s),
  },
  runner: {
    id: 'runner', name: 'Runners',
    art: 'rrr rrr rrr',
    description: 'Fast and frenzied — act quickly',
    duration: 12000, damage: 20, hitsRequired: 1,
    label: (s) => chalk.bold.red(s),
  },
  brute: {
    id: 'brute', name: 'Brute',
    art: ' B R U T E ',
    description: 'Armoured giant — two hits to bring it down',
    duration: 20000, damage: 25, hitsRequired: 2,
    label: (s) => chalk.magenta(s),
  },
  horde: {
    id: 'horde', name: 'Horde',
    art: 'rrrrrrrrrrr',
    description: 'Many at once — three attacks needed',
    duration: 16000, damage: 35, hitsRequired: 3,
    label: (s) => chalk.bold.yellow(s),
  },
};

export const ATTACK_COST       = 20;
export const AUTO_DEFENCE_COST = 10;
const MIN_NEXT_WAVE_MS = 3 * 60 * 1000;
const MAX_NEXT_WAVE_MS = 10 * 60 * 1000;

function pickZombieType(waveNum) {
  if (waveNum <= 2) return ZOMBIE_TYPES.shambler;
  if (waveNum <= 4) {
    return Math.random() < 0.7 ? ZOMBIE_TYPES.shambler : ZOMBIE_TYPES.runner;
  }
  if (waveNum <= 7) {
    const r = Math.random();
    if (r < 0.4) return ZOMBIE_TYPES.shambler;
    if (r < 0.8) return ZOMBIE_TYPES.runner;
    return ZOMBIE_TYPES.brute;
  }
  const r = Math.random();
  if (r < 0.3) return ZOMBIE_TYPES.shambler;
  if (r < 0.55) return ZOMBIE_TYPES.runner;
  if (r < 0.85) return ZOMBIE_TYPES.brute;
  return ZOMBIE_TYPES.horde;
}

function scheduleNextWave() {
  const span = MAX_NEXT_WAVE_MS - MIN_NEXT_WAVE_MS;
  game.nextWaveAt = Date.now() + MIN_NEXT_WAVE_MS + Math.random() * span;
}

export function resetWaves() {
  game.waveActive        = false;
  game.waveCount         = 0;
  game.survivedWaves     = 0;
  game.currentZombieType = null;
  game.hitsLeft          = 0;
  game.waveDuration      = 10000;
  game.waveStartedAt     = 0;
  scheduleNextWave();
}

export function zombieBarText() {
  const width     = 10;
  const remaining = Math.max(0, game.waveDuration - (Date.now() - game.waveStartedAt));
  const elapsed   = game.waveDuration - remaining;
  const filled    = Math.min(width, Math.round((elapsed / game.waveDuration) * width));
  const secs      = Math.ceil(remaining / 1000);
  const zLabel    = game.currentZombieType?.label ?? chalk.red;
  const hitInfo   = game.hitsLeft > 1 ? chalk.dim(` x${game.hitsLeft}`) : '';
  return zLabel('Z[') + chalk.bold.red('█'.repeat(filled)) + chalk.gray('░'.repeat(width - filled)) + zLabel(`] ${String(secs).padStart(2)}s`) + hitInfo;
}

function startWave(rl) {
  const zType = pickZombieType(game.waveCount + 1);
  game.waveActive        = true;
  game.waveStartedAt     = Date.now();
  game.waveCount++;
  game.currentZombieType = zType;
  game.hitsLeft          = zType.hitsRequired;

  if (game.blackout) {
    // No guards, hatch open — they walk straight in
    game.waveDuration = 4000;
    printAbovePrompt(rl,
      '\n' +
      chalk.bold.red('  ✖  BREACH — hatch unsecured! ') + zType.label(zType.name) + chalk.red(' walk right in!\n') +
      chalk.dim('     ') + zType.label(zType.art) + '\n' +
      chalk.bold.red('     4 seconds. Type ') + chalk.yellow('/attack') + chalk.bold.red(' NOW.')
    );
  } else {
    game.waveDuration = zType.duration;
    const hits = zType.hitsRequired > 1
      ? chalk.dim(` (${zType.hitsRequired} attacks needed)`)
      : '';
    printAbovePrompt(rl,
      '\n' +
      chalk.bold.red('  ⚠  WAVE #') + chalk.bold.red(String(game.waveCount)) +
      chalk.dim('  ') + zType.label(zType.name) +
      chalk.dim(' — ') + chalk.dim(zType.description) + hits + '\n' +
      chalk.dim('     ') + zType.label(zType.art) + '\n' +
      chalk.dim('     Type ') + chalk.yellow('/attack') +
      chalk.dim(' before the countdown hits zero.')
    );
  }
}

async function playArrivalAnimation(rl) {
  const zType = game.currentZombieType;
  const zl    = zType.label;
  const frames = [
    [
      '',
      zl(`     ${zType.art}`),
      chalk.dim('     ...converging on the bunker...'),
    ],
    [
      '',
      chalk.bold.red(`     — ${zType.name.toUpperCase()} AT THE HATCH —`),
      zl('     /¯\\  /¯\\  /¯\\  /¯\\'),
    ],
    [
      '',
      chalk.bold.red('     >>>  BREACH  <<<  ') + zl(`${zType.name} break through!`),
    ],
  ];
  for (const f of frames) {
    printAbovePrompt(rl, f.join('\n'));
    await sleep(550);
  }
}

export async function waveBreaks(rl, onDeath) {
  game.waveActive = false;
  game.animating  = true;

  await playArrivalAnimation(rl);

  const dmg = game.currentZombieType?.damage ?? 20;
  game.hp = Math.max(0, game.hp - dmg);
  printAbovePrompt(rl,
    chalk.bold.red(`  ✗ You took ${dmg} damage. `) +
    chalk.dim(`HP: ${game.hp}/${game.maxHp}`)
  );

  if (game.hp <= 0) {
    game.alive = false;
    await onDeath(rl);
  }

  game.animating = false;
  scheduleNextWave();
}

function tryAutoDefence(rl) {
  if (!game.isNight || game.powerSaveActive || !game.waveActive) return;
  while (game.hitsLeft > 0 && game.battery >= AUTO_DEFENCE_COST) {
    game.battery -= AUTO_DEFENCE_COST;
    game.hitsLeft--;
  }
  if (game.hitsLeft === 0) {
    game.waveActive = false;
    game.survivedWaves++;
    scheduleNextWave();
    printAbovePrompt(rl,
      chalk.bold.green('  ◎ Auto-defence engaged. ') +
      chalk.dim(`Wave repelled. Battery: ${Math.round(game.battery)}%. (survived: ${game.survivedWaves})`)
    );
  }
}

export function zombieTick(rl, onDeath) {
  if (!game.gameMode || !game.alive || game.animating) return;

  // Power-save pauses the wave countdown — the player can breathe.
  if (game.waveActive && game.powerSaveActive) {
    game.waveStartedAt += TICK_MS;
  }

  if (!game.waveActive && Date.now() >= game.nextWaveAt) {
    startWave(rl);
    return;
  }
  if (game.waveActive) {
    tryAutoDefence(rl);
    if (!game.waveActive) return;
    const remaining = game.waveDuration - (Date.now() - game.waveStartedAt);
    if (remaining <= 0) {
      waveBreaks(rl, onDeath);
    }
  }
}

export function attackZombies() {
  if (!game.waveActive) {
    console.log(chalk.dim('  The perimeter is quiet. No zombies in sight.\n'));
    return;
  }
  if (game.battery < ATTACK_COST) {
    console.log(
      chalk.red(`  ✗ Not enough battery to attack (need ${ATTACK_COST}%, have ${Math.round(game.battery)}%). `) +
      chalk.dim('Brace for the hit or wait for solar.\n')
    );
    return;
  }

  game.battery -= ATTACK_COST;
  game.hitsLeft--;

  if (game.hitsLeft > 0) {
    const zl = game.currentZombieType?.label ?? chalk.red;
    console.log(
      chalk.yellow(`  ✓ Hit landed. `) +
      zl(game.currentZombieType?.name ?? 'Zombies') +
      chalk.dim(` still pushing — ${game.hitsLeft} more attack${game.hitsLeft > 1 ? 's' : ''} needed.\n`)
    );
    return;
  }

  game.waveActive = false;
  game.survivedWaves++;
  scheduleNextWave();
  console.log(
    chalk.bold.green('  ✓ Wave repelled. ') +
    chalk.dim(`The bunker holds. Battery: ${Math.round(game.battery)}%. (survived: ${game.survivedWaves})`) + '\n'
  );
}
