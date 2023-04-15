// Executes commands requested by a command interaction.

const { Client, BaseInteraction } = require('discord.js');
// const { botSettings } = require('../../../configs/heejinSettings.json');
const { userManager } = require('../../../modules/mongo');
const { stringTools } = require('../../../modules/jsTools');
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

                // Send the mebed
                return await args.interaction.editReply({
                    content: `**You haven't started yet!** Use </start:${startCommandID}> first!`
                });
            }

            // Execute the command function
            return await slashCommand.execute(client, args.interaction).then(async () => {
                // Check if the user can level up
                let leveled = await userManager.tryLevelUp(args.interaction.user.id);

                // Send a level up message if the user leveled up successfully
                if (leveled.leveled) {
                    // Gotta have a level up message to actually send
                    let lvlMsg = `Congratulations, ${args.interaction.user}! You gained %LVLS_GAINED %DYNLVLSTR! You are now level %CURRLVL.`
                        .replace("%LVLS_GAINED", stringTools.formatNumber(leveled.levels_gained))
                        .replace("%DYNLVLSTR", leveled.levels_gained > 1 ? "levels" : "level")
                        .replace("%CURRLVL", stringTools.formatNumber(leveled.level_current));

                    // Send the level up message we created above
                    // not awaited because we don't need any information from the returned message
                    await args.interaction.channel.send({ content: lvlMsg, allowedMentions: { repliedUser: false } });
                }
            });
        } catch (err) {
            // Log the error
            return logger.error("Failed to execute slash command", `\"${args.interaction.commandName}\"`, err);
        }
    }
};