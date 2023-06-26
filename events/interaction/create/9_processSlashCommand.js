// An example of an event function.

const { Client, BaseInteraction, PermissionsBitField } = require('discord.js');

const { OWNER_ID, ADMIN_IDS, admin_bypass_ids } = require('../../../configs/config_client.json');
const { community_server, TIP_CHANCE } = require('../../../configs/config_bot.json');

const { generalQuestObjectiveComplete_ES } = require('../../../modules/embedStyles');
const { BetterEmbed } = require('../../../modules/discordTools');
const { randomTools } = require('../../../modules/jsTools');
const { userManager } = require('../../../modules/mongo');
const logger = require('../../../modules/logger');

const tips = require('../../../configs/tips.json');

function userIsBotAdminOrBypass(interaction) {
    return [OWNER_ID, ...ADMIN_IDS, ...admin_bypass_ids[interaction.commandName]].includes(interaction.user.id);
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
            interaction: args.interaction, author: { text: `🎉 Congratulations, %AUTHOR_NAME!` }
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
                let _isCommunityServer = args.interaction.guildId === community_server.ID;
                let _isCommunityServerAdminChannel = args.interaction.channelId === community_server.channel_ids.ADMIN;

                // Check if the command requires the user to be an admin for the bot
                if (_botAdminOnly && !userIsBotAdminOrBypass(args.interaction))
                    return await embed_error.send({ description: "Only Heejin staff can use this command", ephemeral: true });

                // Check if the command requires the user to have admin in the current guild
                if (_guildAdminOnly && !userIsGuildAdminOrBypass())
                    return await embed_error.send({ description: "You need admin to use this command", ephemeral: true });

                // Check if the a botAdminOnly/guildAdminOnly command was ran in the community server
                if (_isCommunityServer && _isCommunityServerAdminChannel && (_botAdminOnly || _guildAdminOnly))
                    return await embed_error.send({ description: `You can only use that command in <#${community_server.channel_ids.ADMIN}>`, ephemeral: true });
            }

            // Defer the interaction
            if (slashCommand?.options?.deferReply) await args.interaction.deferReply();

            /// Check if the user's in our Mongo database
            let _userDataExists = await userManager.exists(args.interaction.user.id);
            let _dontRequireUserData = slashCommand?.options?.dontRequireUserData || false;

            if (!_userDataExists && !_dontRequireUserData)
                return await embed_error.send({ description: "**You have not started yet!** Use \`/start\` first!", ephemeral: true });

            // Cache the user's current UserData if available || REQUIRED FOR QUESTS ONLY
            let cacheUserQuestData = await userManager.quests.cache(args.interaction.user.id);

            // Execute the slash command's function
            slashCommand.execute(client, args.interaction).then(async message => {
                try {
                    // Handle post-execute quest caching 
                    cacheUserQuestData().then(async _parsedQuestData => {
                        if (!_parsedQuestData) return; /* console.log(_parsedQuestData); */
                        /// Iterate through quest progresses
                        for (let _questProgress of _parsedQuestData.progress) {
                            let _requirementsCompleted = _questProgress.requirementsCompleted;
                            // console.log(_requirementsCompleted);

                            // Send an embed to alert the user they completed a quest requirement(s)
                            if (_requirementsCompleted.length) {
                                // Create the quest requirement(s) complete embed
                                let embed_questObjectiveComplete = generalQuestObjectiveComplete_ES(
                                    args.interaction.member, _questProgress
                                );

                                // Send the embed
                                await args.interaction.followUp({ embeds: [embed_questObjectiveComplete] });
                            }
                        }

                        /// Other stuff
                        if (_parsedQuestData.completed.length) {
                            // TODO: do something about it
                        }
                    });

                    // Check if the user can level up
                    userManager.xp.tryLevelUp(args.interaction.user.id).then(async _userLevelUp => {
                        if (_userLevelUp.leveled) {
                            // Create the level up message
                            let levelUpText = `\\🎉 Congratulations, %AUTHOR_NAME! You are now \`LV. ${_userLevelUp.level_current}\``;

                            // Edit the current message with the level up message
                            // if the message can't be edited, send a separate message
                            try {
                                await message.edit({ content: `**${levelUpText}**` });
                            } catch {
                                await embed_userLevelUp.send({ description: `You are now \`LV. ${_userLevelUp.level_current}\`` });
                            }
                        }
                    });
                } catch (err) { console.error(err); }
            });

            try {
                // Send a random Tips N' Tricks messeage to the channel
                if (randomTools.chance(TIP_CHANCE)) embed_tip.send({
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