// An example of an event function.

const { Client, BaseInteraction, PermissionsBitField } = require('discord.js');

const { ownerID, adminIDs, adminBypassIDs } = require('../../../configs/clientSettings.json');
const { communityServer, botSettings: { chanceToShowTips } } = require('../../../configs/heejinSettings.json');

const { quest_objectiveComplete_ES } = require('../../../modules/embedStyles');
const { questManager } = require('../../../modules/mongo/index');
const { BetterEmbed } = require('../../../modules/discordTools');
const { randomTools } = require('../../../modules/jsTools');
const { userManager } = require('../../../modules/mongo');

const messenger = require('../../../modules/messenger');
const logger = require('../../../modules/logger');

const tips = require('../../../configs/heejinTips.json');

function userIsBotAdminOrBypass(interaction) {
    return [ownerID, ...adminIDs, ...adminBypassIDs[interaction.commandName]].includes(interaction.user.id);
}

function userIsGuildAdminOrBypass(interaction) {
    let isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    let canBypass = userIsBotAdminOrBypass(interaction);

    return isAdmin || canBypass;
}

module.exports = {
    name: "processSlashCommand",
    event: "interaction_create",

    /**
     * @param {Client} client
     * @param {{ interaction: BaseInteraction }} args
     */
    execute: async (client, args) => {
        // Filter out non-guild and non-command interactions
        if (!args.interaction.guild || !args.interaction.isCommand()) return;

        /// Misc. embeds
        let embed_error = new BetterEmbed({
            interaction: args.interaction, author: { text: "⛔ Something is wrong" }
        });
        let embed_tip = new BetterEmbed({
            interaction: args.interaction, author: { text: "⚠️ Did You Know?" }
        });
        let embed_userLevelUp = new BetterEmbed({
            interaction: args.interaction, author: { text: `🎉 Congratulations, ${args.interaction.user}!` }
        });

        // Get the slash command function from the client if it exists
        let slashCommand = client.slashCommands.get(args.interaction.commandName) || null;
        if (!slashCommand) return await embed_error.send({ description: `\`/${args.interaction.commandName}\` is not a command` });

        // Execute the command
        try {
            // Parse slash command options
            if (slashCommand?.options) {
                let _botAdminOnly = slashCommand.options?.botAdminOnly;
                let _guildAdminOnly = slashCommand.options?.guildAdminOnly;
                let _isCommunityServer = args.interaction.guildId === communityServer.id;
                let _isCommunityServerAdminChannel = args.interaction.channelId === communityServer.adminChannelID;

                // Check if the command requires the user to be an admin for the bot
                if (_botAdminOnly && !userIsBotAdminOrBypass(args.interaction))
                    return await embed_error.send({ description: "Only Heejin staff can use this command", ephemeral: true });

                // Check if the command requires the user to have admin in the current guild
                if (_guildAdminOnly && !userIsGuildAdminOrBypass())
                    return await embed_error.send({ description: "You need admin to use this command", ephemeral: true });

                // Check if the a botAdminOnly/guildAdminOnly command was ran in the community server
                if (_isCommunityServer && _isCommunityServerAdminChannel && (_botAdminOnly || _guildAdminOnly))
                    return await embed_error.send({ description: `You can only use that command in <#${communityServer.adminChannelID}>`, ephemeral: true });
            }

            // Defer the interaction
            if (slashCommand?.options?.deferReply) await args.interaction.deferReply();

            /// Check if the user's in our Mongo database
            let _userDataExists = await userManager.exists(args.interaction.user.id);
            let _dontRequireUserData = slashCommand?.options?.dontRequireUserData || false;

            if (!_userDataExists && !_dontRequireUserData)
                return await embed_error.send({ description: "**You have not started yet!** Use \`/start\` first!", ephemeral: true });

            // Cache the user's current UserData if available || REQUIRED FOR QUESTS ONLY
            // TODO: let cacheUserQuestData = await userManager.quests.cache(args.interaction.user.id);

            // Execute the slash command's function
            slashCommand.execute(client, args.interaction).then(async message => {
                try {
                    // Check if the user can level up
                    userManager.xp.tryLevelUp(args.interaction.user.id).then(async _userLevelUp => {
                        if (_userLevelUp.leveled) {
                            // Create the level up message
                            let levelUpText = `\\🎉 Congratulations, %USER! You are now \`LV. %CURRENT_LVL\``
                                .replace("%USER", args.interaction.user)
                                .replace("%CURRENT_LVL", _userLevelUp.level_current);

                            // Edit the current message with the level up message
                            // if the message can't be edited, send a separate message
                            try {
                                await message.edit({ content: `**${levelUpText}**` });
                            } catch {
                                await embed_userLevelUp.send({ description: `You are now \`LV. ${_userLevelUp.level_current}\`` });
                            }
                        }
                    });

                    // Handle post-execute quest caching
                    await questManager.cache.updateCache(args.interaction.user.id).then(async questCache => {
                        if (!questCache) return; /* console.log(questCache); */

                        // Iterate through quest progress
                        for (let quest_progress of questCache.progress) {
                            // Let the user know if they completed an objective(s)
                            if (quest_progress.objectives_just_complete.length) {
                                // Create the object complete embed
                                let _embed_questObjectiveComplete = quest_objectiveComplete_ES(
                                    args.interaction.member, quest_progress
                                );

                                // Send the embed
                                try { args.interaction.followUp({ embeds: [_embed_questObjectiveComplete] }); }
                                catch { args.interaction.channel.send({ embeds: [_embed_questObjectiveComplete] }); }
                            }
                        }

                        // Iterate through complete quests
                        for (let quest_complete of questCache.quests_complete) {
                            // Mark the quest as complete for the user and give the rewards
                            questManager.user.markComplete(args.interaction.user.id, quest_complete.id).then(async marked => {
                                if (!marked) return;

                                // Send the user a DM congratulating them on completing the quest
                                await messenger.quest.complete(args.interaction.user, quest_complete);
                            });
                        }
                    });
                } catch (err) { console.error(err); }
            });

            try {
                // Send a random Tips N' Tricks messeage to the channel
                if (randomTools.chance(chanceToShowTips)) embed_tip.send({
                    description: randomTools.choice(tips), method: "send"
                });
            } catch { }
        } catch (err) {
            logger.error(
                "An error occurred: SLSH_CMD",
                `cmd: /${args.interaction.commandName} | guildID: ${args.interaction.guild.id} | userID: ${args.interaction.user.id}`,
                err
            );
        }
    }
};