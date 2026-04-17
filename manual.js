import chalk from 'chalk';

export function showManual() {
  const lines = [
    '',
    chalk.bold.white('  Welcome to BunkerCLI.'),
    chalk.dim('  ─────────────────────────────────────────────'),
    '',
    `  ${chalk.yellow('/help')}   — see all commands`,
    `  ${chalk.yellow('/start')}  — seal the hatches and begin`,
    `  ${chalk.yellow('/exit')}   — leave the bunker`,
    '',
  ];
  for (const line of lines) console.log(line);
}
