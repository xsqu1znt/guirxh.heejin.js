// Imports all slash commands found in ('../../slash_commands').

const { readdirSync } = require('fs');

const { Client } = require('discord.js');
const logger = require('../logger');

function importSlashCommands(dir) {
    let slash_commands = [];
    let files = readdirSync(`.${dir}`);
    // let files = readdirSync(`${dir}`);

    for (let entry of files) if (entry.includes("SLSH") && entry.endsWith('.js')) {
        try {
            slash_commands.push(require(`${dir}/${entry}`));
            // slash_commands.push(require(`../.${dir}/${entry}`));
        } catch (err) {
            logger.error("Failed to import slash command", `at: \'${`${dir}/${entry}`}\'`, err);
        }
    }

    return slash_commands;
}

module.exports = {
    /**
     * @param {Client} client 
     */
    init: (client) => {
        let slash_commands = importSlashCommands('../../slash_commands');
        // let slash_commands = importSlashCommands('./slash_commands');
        let slash_commands_admin = importSlashCommands('../../slash_commands/admin');
        // let slash_commands_admin = importSlashCommands('./slash_commands/admin');

        for (let slash_command of slash_commands)
            client.slashCommands.set(slash_command.builder.name, slash_command);

        for (let slash_command_admin of slash_commands_admin)
            client.slashCommands_admin.set(slash_command_admin.builder.name, slash_command_admin);
    }
};