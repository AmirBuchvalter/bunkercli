import chalk from 'chalk';

export function showManual() {
  const dim    = chalk.dim;
  const b      = chalk.bold.white;
  const y      = chalk.yellow;
  const g      = chalk.bold.green;
  const c      = chalk.cyan;
  const red    = chalk.red;
  const blue   = chalk.blue;

  const lines = [
    '',
    b('  SURVIVAL BRIEFING'),
    dim('  ' + '─'.repeat(52)),
    '',
    `  ${b('OBJECTIVE')}`,
    `  Defend the underground bunker from zombie waves for`,
    `  as long as possible. Each wave must be repelled before`,
    `  the countdown hits zero — or you take the full hit.`,
    '',
    `  ${b('POWER & BATTERY')}`,
    `  • Bunker starts at ${y('40%')} battery, max ${y('100%')}.`,
    `  • ${chalk.yellow('☀')}  Solar receivers charge the battery during ${b('daytime')}.`,
    `  • ${chalk.blue('☽')}  No solar at ${b('night')} — conserve what you have.`,
    `  • Day/night switches every ${y('5 minutes')}.`,
    '',
    `  ${b('ACTIONS')}`,
    `  ${y('/attack')}      Fight off an active wave.  Costs ${red('-20% battery')}.`,
    `               If battery is too low, you cannot attack.`,
    `  ${y('/watercycle')}  Run the water recycling loop.  Costs ${red('-20% battery')}.`,
    `               If skipped, the bunker auto-runs it and`,
    `               drains battery — or causes ${red('HP loss')} if empty.`,
    `  ${y('/powersave')}   Toggle power-saving mode:`,
    `               ${g('ON')}  → watercycle runs half as often (saves power)`,
    `                    but ${red('disables auto-defence')} at night.`,
    `               ${g('OFF')} → full systems online.`,
    '',
    `  ${b('NIGHT AUTO-DEFENCE')}`,
    `  At night the bunker's auto-defence turrets engage`,
    `  automatically — but each hit costs ${red('-10% battery')}.`,
    `  Disable them with ${y('/powersave')} to save power (risky).`,
    '',
    `  ${b('ZOMBIE WAVES')}`,
    `  Waves escalate in difficulty over time:`,
    `  ${red('Shamblers')} → ${chalk.bold.red('Runners')} → ${chalk.magenta('Brutes')} → ${chalk.bold.yellow('Horde')}`,
    `  Some enemies need multiple attacks to bring down.`,
    '',
    dim('  ' + '─'.repeat(52)),
    `  Type ${y('/start')} to seal the hatches.  ${c('/help')} for all commands.`,
    '',
  ];

  for (const line of lines) console.log(line);
}
