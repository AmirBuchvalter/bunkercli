import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const chatsPath = join(__dirname, '..', 'data', 'chats.json');
const chatsData = JSON.parse(readFileSync(chatsPath, 'utf8'));

export const chat = {
  active     : false,
  npc        : null,
  nodeId     : null,
};

export function getAllNpcs() {
  return chatsData.npcs;
}

export function pickRandomNpc() {
  const list = chatsData.npcs;
  return list[Math.floor(Math.random() * list.length)];
}

export function isActive() {
  return chat.active;
}

export function currentNpc() {
  return chat.npc;
}

function currentNode() {
  if (!chat.npc || !chat.nodeId) return null;
  return chat.npc.nodes[chat.nodeId];
}

function renderNodeLines() {
  const node = currentNode();
  if (!node) return '';
  const lines = [
    '',
    chalk.bold.cyan(`  ${chat.npc.name}: `) + chalk.white(node.text),
    '',
  ];
  node.choices.forEach((c, i) => {
    lines.push(chalk.yellow(`    ${i + 1}) `) + chalk.white(c.text));
  });
  lines.push('');
  lines.push(chalk.dim('    Type 1, 2, or 3 to respond.'));
  return lines.join('\n');
}

export function startChat(npc, printAbovePrompt, rl) {
  chat.active = true;
  chat.npc    = npc;
  chat.nodeId = npc.entryNodeId;
  printAbovePrompt(rl, renderNodeLines());
}

export function endChat() {
  chat.active = false;
  chat.npc    = null;
  chat.nodeId = null;
}

/**
 * Handle numeric input (1/2/3) while a chat is active.
 * Returns one of:
 *   { action: 'continue' }           — moved to another node
 *   { action: 'leaves' }             — NPC agreed to leave
 *   { action: 'stays', text: string } — NPC refused, bunker now has a freeloader
 *   { action: 'invalid' }            — bad input
 */
export function handleChoice(n, printAbovePrompt, rl) {
  if (!chat.active) return { action: 'invalid' };
  const node = currentNode();
  if (!node) return { action: 'invalid' };
  const idx = n - 1;
  if (idx < 0 || idx >= node.choices.length) return { action: 'invalid' };

  const choice = node.choices[idx];
  printAbovePrompt(rl, chalk.green(`    > ${choice.text}`));

  if (node.isLeaveNode) {
    const result = choice.result;
    if (result === 'leaves') {
      return { action: 'leaves' };
    }
    return { action: 'stays', text: choice.text };
  }

  chat.nodeId = choice.next;
  printAbovePrompt(rl, renderNodeLines());
  return { action: 'continue' };
}
