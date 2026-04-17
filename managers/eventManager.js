import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { game, printAbovePrompt } from '../game.js';

const _dish   = chalk.rgb(200, 205, 215);
const _struct = chalk.rgb(150, 155, 165);
const _signal = chalk.rgb(100, 200, 255);
const _dim    = chalk.rgb(60,  90, 150);

function satellitePaint() {
  const s = _signal; const d = _dish; const t = _struct; const k = _dim;
  return [
    `       ${s('·')}  ${k('*')}    ${s('·')}  ${k('*')}    ${s('·')}  ${k('*')}`,
    `          ${k('*')}  ${s('·')}    ${s('·')}  ${k('*')}   `,
    `        ${d('╱─────────────────╲')}`,
    `       ${d('╱')} ${d('╱───────────────╲')} ${d('╲')}`,
    `      ${d('╱')} ${d('╱')}               ${d('╲')} ${d('╲')}`,
    `     ${d('╱')} ${d('╱')}     ${s('◉')}           ${d('╲')} ${d('╲')}`,
    `    ${d('╱─╱───────────────────╲─╲')}`,
    `    ${d('╰─────────────────────────╯')}`,
    `              ${t('║')}`,
    `           ${t('═══╩═══')}`,
    `             ${t('▓▓▓')}`,
  ].join('\n');
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const eventsPath = join(__dirname, '..', 'data', 'events.json');
const events = JSON.parse(readFileSync(eventsPath, 'utf8'));

const MIN_EVENT_MS = 60 * 1000;
const MAX_EVENT_MS = 150 * 1000;

export const weather = {
  solarMultiplier: 1.0,
  clearsAt       : 0,
};

const weatherState = { nextAt: 0 };
const radioState   = { nextAt: 0 };
const frontState   = { nextAt: 0 };
const ambientState = { nextAt: 0 };

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function scheduleNext(state) {
  state.nextAt = Date.now() + MIN_EVENT_MS + Math.random() * (MAX_EVENT_MS - MIN_EVENT_MS);
}

export function reset() {
  const now = Date.now();
  weatherState.nextAt = now + 90 * 1000;
  radioState.nextAt   = now + 45 * 1000;
  frontState.nextAt   = now + 75 * 1000;
  ambientState.nextAt = now + 30 * 1000;
  weather.solarMultiplier = 1.0;
  weather.clearsAt = 0;
}

export function eventTick(rl) {
  if (!game.gameMode || !game.alive) return;
  const now = Date.now();

  if (weather.clearsAt && now >= weather.clearsAt) {
    weather.solarMultiplier = 1.0;
    weather.clearsAt = 0;
  }

  if (now >= weatherState.nextAt) {
    const w = pick(events.weather);
    weather.solarMultiplier = w.solarMultiplier;
    weather.clearsAt = now + w.durationMs;
    printAbovePrompt(rl, chalk.bold.blue('  ☁  ') + chalk.white(w.text));
    scheduleNext(weatherState);
  }

  if (now >= radioState.nextAt) {
    printAbovePrompt(rl, chalk.dim('  ') + chalk.bold.magenta(pick(events.radio)));
    scheduleNext(radioState);
  }

  if (now >= frontState.nextAt) {
    const f = pick(events.front);
    printAbovePrompt(rl, satellitePaint() + '\n' + chalk.dim('  ') + chalk.bold.yellow(f.text));
    scheduleNext(frontState);
  }

  if (now >= ambientState.nextAt) {
    printAbovePrompt(rl, chalk.dim('  · ' + pick(events.ambient)));
    scheduleNext(ambientState);
  }
}
