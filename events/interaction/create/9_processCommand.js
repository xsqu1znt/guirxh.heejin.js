// Executes commands requested by a command interaction.

const { Client, BaseInteraction, PermissionsBitField } = require('discord.js');

const heejinTips = require('../../../configs/heejinTips.json');
const { ownerID, adminIDs, adminBypassIDs } = require('../../../configs/clientSettings.json');
const { communityServer, botSettings: { chanceToShowTips } } = require('../../../configs/heejinSettings.json');
const { randomTools, stringTools } = require('../../../modules/jsTools');
const { BetterEmbed } = require('../../../modules/discordTools');
const { userManager } = require('../../../modules/mongo');
const questManager = require('../../../modules/questManager');
const logger = require('../../../modules/logger');

module.exports = {
    name: "process_slashCommand",
    event: "interaction_create",

    /**
     * @param {Client} client 
     * @param {{ interaction: BaseInteraction }} args
     */
    execute: async (client, args) => {
        let embed_error = new BetterEmbed({ interaction: args.interaction });

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
                content: "You do not have permission to use this command, silly!", ephemeral: true
            });

            // Check if the command requires the user to have admin in the guild
            if (slashCommand?.requireGuildAdmin) {
                let userHasAdmin = args.interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

                if (![ownerID, ...adminIDs].includes(args.interaction.user.id) && !userHasAdmin)
                    return await args.interaction.reply({
                        content: "You need admin to use this command, silly!", ephemeral: true
                    });
            }

            // Only allow admin commands to be used in the admin channel in the community server
            if (slashCommand?.isOwnerCommand || slashCommand?.requireGuildAdmin) {
                let _isInCommunityServer = (args.interaction.guildId === communityServer.id);
                let _isInCommunityAdminChannel = (args.interaction.channelId === communityServer.adminChannelID);

                if (_isInCommunityServer && !_isInCommunityAdminChannel) {
                    let embed_wrongAdminChannel = new BetterEmbed({
                        interaction: args.interaction, description: "You cannot use that command here, silly!"
                    });

                    return await embed_wrongAdminChannel.send({ ephemeral: true });
                }
            }

            await args.interaction.deferReply();

            // Check if the user's in the database
            if (!await userManager.exists(args.interaction.user.id) && args.interaction.commandName !== "start") {
                // Get the /start command ID
                try {
                    let guildCommands = await args.interaction.guild.commands.fetch();
                    let startCommandID = guildCommands.find(slash_commands => slash_commands.name === "start").id;

                    // Send an error embed
                    return await embed_error.send({
                        description: `**You haven't started yet!** Use </start:${startCommandID}> first!`
                    });
                } catch {
                    // Send an error embed
                    return await embed_error.send({
                        description: `**You haven't started yet!** Use \`/start\` first!`
                    });
                }
            }

            // Cache the user's current data before running the command (quests)
            let cacheQuests = await userManager.quests.cache(args.interaction.user.id);

            // Execute the command function
            return await slashCommand.execute(client, args.interaction).then(async msg => {
                // Check if the user can level up
                let leveled = await userManager.xp.tryLevelUp(args.interaction.user.id);

                // Send a level up message if the user leveled up successfully
                if (leveled.leveled) {
                    // Gotta have a level up message to actually send
                    let lvlMsg = `Congratulations, %USER! You are now level %CURRENT_LVL`
                        .replace("%USER", args.interaction.user)
                        .replace("%CURRENT_LVL", stringTools.formatNumber(leveled.level_current));

                    // Send the level up message we created above
                    // not awaited because we don't need any information from the returned message
                    try {
                        msg.edit({ content: `**${lvlMsg}**\n\n${msg.content}`, allowedMentions: { repliedUser: false } });
                    } catch {
                        await args.interaction.channel.send({ content: lvlMsg, allowedMentions: { repliedUser: false } });
                    }
                }

                // Cache the user's new data after running the command (quests)
                // then check if the user completed any quests
                cacheQuests().then(questData => {
                    /* for (let quest of questData) if (quest.completed) {
                        // do something about it
                    } */
                });

                // Have a chance to send a random tip to the channel
                if (randomTools.chance(chanceToShowTips)) return await new BetterEmbed({
                    interaction: args.interaction, title: { text: "\`⚠️\` **Did You Know?**" },
                    description: randomTools.choice(heejinTips)
                }).send({ method: "send" });
            });
        } catch (err) {
            // Log the error
            return logger.error("Failed to execute slash command", `\"${args.interaction.commandName}\"`, err);
        }
    }
};