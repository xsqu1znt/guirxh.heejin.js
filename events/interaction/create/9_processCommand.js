// Executes commands requested by a command interaction.

const { Client, BaseInteraction, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const { ownerID, adminIDs, adminBypassIDs } = require('../../../configs/clientSettings.json');
const { communityServer, botSettings } = require('../../../configs/heejinSettings.json');
const { randomTools, stringTools } = require('../../../modules/jsTools');
const { messageTools } = require('../../../modules/discordTools');
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
        // Reusable embedinator to send success/error messages
        const embedinator = new messageTools.Embedinator(args.interaction);

        // Filter out non-guild and non-command interactions
        if (!args.interaction.guild || !args.interaction.isCommand()) return;

        // Get the slash command function from the client if it exists
        let slashCommand = client.slashCommands.get(args.interaction.commandName)
            || client.slashCommands_admin.get(args.interaction.commandName)
            || null;

        // Try to execute the slash command function
        if (slashCommand) try {
            // Check if the command requires the user to be an admin for the bot
            if (slashCommand?.isOwnerCommand
                && ![ownerID, ...adminIDs].includes(args.interaction.user.id)
                // Special command bypass
                && !adminBypassIDs[args.interaction.commandName].includes(args.interaction.user.id)
            ) return await args.interaction.reply({
                content: "You don't have permission to use this command, silly!", ephemeral: true
            });

            // Check if the command requires the user to have admin in the guild
            if (slashCommand?.requireGuildAdmin) {
                let userHasAdmin = args.interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

                if (![ownerID, ...adminIDs].includes(args.interaction.user.id) && !userHasAdmin)
                    return await args.interaction.reply({
                        content: "You need admin to use this command, silly!", ephemeral: true
                    });
            }

            await args.interaction.deferReply();

            // Check if the user's in the database
            if (!await userManager.exists(args.interaction.user.id) && args.interaction.commandName !== "start") {
                // Get the /start command ID
                try {
                    let guildCommands = await args.interaction.guild.commands.fetch();
                    let startCommandID = guildCommands.find(slash_commands => slash_commands.name === "start").id;

                    // Send the mebed
                    return await embedinator.send(`**You haven't started yet!** Use </start:${startCommandID}> first!`);
                } catch {
                    // Send the mebed
                    return await embedinator.send(`**You haven't started yet!** Use \`/start\` first!`);
                }
            }

            // Execute the command function
            return await slashCommand.execute(client, args.interaction).then(async () => {
                // Check if the user can level up
                let leveled = await userManager.tryLevelUp(args.interaction.user.id);

                // Send a level up message if the user leveled up successfully
                if (leveled.leveled) {
                    // Gotta have a level up message to actually send
                    let lvlMsg = `Congratulations, %USER! You are now level %CURRENT_LVL.`
                        .replace("%USER", args.interaction.user)
                        .replace("%CURRENT_LVL", stringTools.formatNumber(leveled.level_current));

                    // Send the level up message we created above
                    // not awaited because we don't need any information from the returned message
                    await args.interaction.channel.send({ content: lvlMsg, allowedMentions: { repliedUser: false } });
                }

                // Have a chance to send the invite link to the main server
                if (randomTools.chance(communityServer.chanceToShow) && args.interaction.guild.id !== communityServer.id) {
                    let buttonRow = new ActionRowBuilder().addComponents(new ButtonBuilder()
                        .setLabel("Join our offical server!")
                        .setStyle(ButtonStyle.Link)
                        .setURL(communityServer.url)
                    );

                    return await args.interaction.channel.send({ components: [buttonRow] });
                }
            });
        } catch (err) {
            // Log the error
            return logger.error("Failed to execute slash command", `\"${args.interaction.commandName}\"`, err);
        }
    }
};