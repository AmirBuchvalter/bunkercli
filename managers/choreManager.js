import chalk from 'chalk';
import { game, printAbovePrompt } from '../game.js';

const TICK_MS = 500;
const DEHYDRATION_HP_LOSS = 15;

const CHORES = [
  {
    id       : 'watercycle',
    name     : 'Watercycle',
    icon     : '♺',
    cost     : 20,
    interval : 180000,
    critical : true,
  },
  {
    id       : 'sweep',
    name     : 'Clear bunker',
    icon     : '🧹',
    cost     : 8,
    interval : 300000,
    critical : false,
  },
  {
    id       : 'plants',
    name     : 'Water plants',
    icon     : '🌱',
    cost     : 6,
    interval : 240000,
    critical : false,
  },
  {
    id       : 'vents',
    name     : 'Wash air vents',
    icon     : '♨',
    cost     : 10,
    interval : 360000,
    critical : false,
  },
];

const state = {};

export function reset() {
  const now = Date.now();
  for (const c of CHORES) {
    state[c.id] = { nextRunAt: now + c.interval };
  }
}

function findChore(id) {
  return CHORES.find(c => c.id === id);
}

export function getAll() {
  return CHORES;
}

function autoRun(chore, rl) {
  if (game.battery >= chore.cost) {
    game.battery -= chore.cost;
    state[chore.id].nextRunAt = Date.now() + chore.interval;
    printAbovePrompt(rl,
      chalk.cyan(`  ${chore.icon} ${chore.name} complete. `) +
      chalk.dim(`-${chore.cost}% battery → ${Math.round(game.battery)}%.`)
    );
    return;
  }

  if (chore.critical) {
    game.hp = Math.max(0, game.hp - DEHYDRATION_HP_LOSS);
    state[chore.id].nextRunAt = Date.now() + chore.interval;
    printAbovePrompt(rl,
      chalk.red(`  ⚠ ${chore.name} failed — no power. `) +
      chalk.dim(`Dehydration: -${DEHYDRATION_HP_LOSS} HP (${game.hp}/${game.maxHp}).`)
    );
    return;
  }

  // Non-critical: gently remind, defer briefly
  state[chore.id].nextRunAt = Date.now() + 60000;
  printAbovePrompt(rl,
    chalk.dim(`  ${chore.icon} ${chore.name} overdue — not enough power. It can wait.`)
  );
}

export function choreTick(rl) {
  if (!game.gameMode || !game.alive) return;

  for (const chore of CHORES) {
    const s = state[chore.id];

    // Freeze timers while power-save is active — the bunker is conserving.
    if (game.powerSaveActive) {
      s.nextRunAt += TICK_MS;
      continue;
    }

    if (Date.now() >= s.nextRunAt) {
      autoRun(chore, rl);
      if (!game.alive) return;
    }
  }
}

export function runManually(id) {
  const chore = findChore(id);
  if (!chore) {
    console.log(chalk.red(`  Unknown chore: ${id}\n`));
    return;
  }
  if (game.battery < chore.cost) {
    console.log(chalk.red(`  ✗ Not enough battery for ${chore.name} (need ${chore.cost}%).\n`));
    return;
  }
  game.battery -= chore.cost;
  state[chore.id].nextRunAt = Date.now() + chore.interval;
  console.log(
    chalk.cyan(`  ${chore.icon} ${chore.name} done. `) +
    chalk.dim(`-${chore.cost}% battery → ${Math.round(game.battery)}%.\n`)
  );
}
