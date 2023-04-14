// Executes commands requested by a command interaction.

const { Client, BaseInteraction, EmbedBuilder } = require('discord.js');
const { botSettings } = require('../../../configs/heejinSettings.json');
const { userManager } = require('../../../modules/mongo');
const logger = require('../../../modules/logger');

module.exports = {
    name: "process_slashCommand",
    event: "interaction_create",

    /**
     * @param {Client} client 
     * @param {{ interaction: BaseInteraction }} args
     */
    execute: async (client, args) => {
        // Filter out non-guild and non-command interactions
        if (!args.interaction.guild || !args.interaction.isCommand()) return;

        // Get the slash command function from the client if it exists
        let slashCommand = client.slashCommands.get(args.interaction.commandName) || null;

        // Try to execute the slash command function
        if (slashCommand) try {
            // Defer the reply
            await args.interaction.deferReply();

            // Check if the user's in the database
            if (!await userManager.exists(args.interaction.user.id) && args.interaction.commandName !== "start") {
                // Get the start command ID
                let guildCommands = await args.interaction.guild.commands.fetch();
                let startCommandID = guildCommands.find(slash_commands => slash_commands.name === "start").id;

                // Create an embed to tell the user they must start first
                let embed_mustStart = new EmbedBuilder({
                    description: `**You having started yet!** Use </start:${startCommandID}> first!`,
                    color: botSettings.embedColor || null
                });

                // Send the mebed
                return await args.interaction.editReply({ embeds: [embed_mustStart] });
            }

            // Execute the command function
            return await slashCommand.execute(client, args.interaction);
        } catch (err) {
            // Log the error
            return logger.error("Failed to execute slash command", `\"${args.interaction.commandName}\"`, err);
        }
    }
};