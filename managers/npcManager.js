import chalk from 'chalk';
import { game, printAbovePrompt } from '../game.js';
import * as chatManager from './chatManager.js';

const MIN_ARRIVAL_MS = 90 * 1000;
const MAX_ARRIVAL_MS = 150 * 1000;
const DRAIN_BATTERY_PER_TICK = 0.10;
const DRAIN_HP_PER_TICK      = 0.05;

export const npc = {
  state        : 'idle',   // 'idle' | 'atDoor' | 'inside' | 'staying'
  current      : null,
  nextArrivalAt: 0,
};

function scheduleNextArrival() {
  const span = MAX_ARRIVAL_MS - MIN_ARRIVAL_MS;
  npc.nextArrivalAt = Date.now() + MIN_ARRIVAL_MS + Math.random() * span;
}

export function reset() {
  npc.state   = 'idle';
  npc.current = null;
  chatManager.endChat();
  scheduleNextArrival();
}

export function npcTick(rl) {
  if (!game.gameMode || !game.alive) return;

  if (npc.state === 'idle' && Date.now() >= npc.nextArrivalAt) {
    const chosen = chatManager.pickRandomNpc();
    npc.current = chosen;

    if (game.blackout) {
      // Hatch unsecured — they walk straight in
      npc.state = 'inside';
      printAbovePrompt(rl,
        '\n' +
        chalk.bold.red('  ◆ The hatch is open. ') +
        chalk.white(chosen.arrivalLine) + '\n' +
        chalk.red(`    ${chosen.name} steps inside without knocking.`)
      );
      chatManager.startChat(chosen, printAbovePrompt, rl);
    } else {
      npc.state = 'atDoor';
      printAbovePrompt(rl,
        '\n' +
        chalk.bold.magenta('  ◆ A visitor at the hatch. ') +
        chalk.white(chosen.arrivalLine) + '\n' +
        chalk.dim(`    "${chosen.name}" — ${chosen.title}.`) + '\n' +
        chalk.dim(`    ${chosen.atDoorLine}`) + '\n' +
        chalk.dim('    Type ') + chalk.yellow('/admit') +
        chalk.dim(' to let them in, or ') + chalk.yellow('/turnaway') +
        chalk.dim(' to send them away.')
      );
    }
    return;
  }

  if (npc.state === 'staying' && !game.powerSaveActive) {
    const mult = npc.current?.dryingUpRate ?? { battery: 1, water: 1 };
    game.battery = Math.max(0, game.battery - DRAIN_BATTERY_PER_TICK * mult.battery);
    game.hp      = Math.max(0, game.hp      - DRAIN_HP_PER_TICK      * mult.water);
  }
}

export function admit(rl) {
  if (npc.state !== 'atDoor') {
    printAbovePrompt(rl, chalk.dim('  No visitor at the hatch.'));
    return;
  }
  npc.state = 'inside';
  printAbovePrompt(rl,
    chalk.bold.green('  ◆ You unseal the hatch. ') +
    chalk.dim(`${npc.current.name} steps inside.`)
  );
  chatManager.startChat(npc.current, printAbovePrompt, rl);
}

export function turnAway(rl) {
  if (npc.state !== 'atDoor') {
    printAbovePrompt(rl, chalk.dim('  No visitor at the hatch.'));
    return;
  }
  const name = npc.current.name;
  printAbovePrompt(rl,
    chalk.dim(`  ◆ You stay quiet. ${name} waits, then walks back into the dusk.`)
  );
  npc.current = null;
  npc.state   = 'idle';
  scheduleNextArrival();
}

export function talk(rl) {
  if (npc.state !== 'staying') {
    printAbovePrompt(rl, chalk.dim('  There is no one inside to talk to.'));
    return;
  }
  npc.state = 'inside';
  printAbovePrompt(rl,
    chalk.dim(`  ◆ You try talking to ${npc.current.name} again.`)
  );
  chatManager.startChat(npc.current, printAbovePrompt, rl);
}

/** Called by runCommand when user enters 1/2/3 and chat is active. */
export function handleChoice(n, rl) {
  const result = chatManager.handleChoice(n, printAbovePrompt, rl);
  if (result.action === 'leaves') {
    const name = npc.current?.name ?? 'The visitor';
    chatManager.endChat();
    printAbovePrompt(rl,
      chalk.bold.green(`  ◆ ${name} gathers their things and leaves peacefully.`)
    );
    npc.current = null;
    npc.state   = 'idle';
    scheduleNextArrival();
  } else if (result.action === 'stays') {
    const name = npc.current?.name ?? 'The visitor';
    chatManager.endChat();
    npc.state = 'staying';
    printAbovePrompt(rl,
      chalk.bold.yellow(`  ◆ ${name} refuses to leave. `) +
      chalk.dim('They settle into a corner and begin using your supplies.') + '\n' +
      chalk.dim('    Try ') + chalk.yellow('/talk') +
      chalk.dim(' to find the right words to send them on their way.')
    );
  } else if (result.action === 'invalid') {
    printAbovePrompt(rl, chalk.dim('  (Pick 1, 2, or 3.)'));
  }
}
