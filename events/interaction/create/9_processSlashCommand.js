// An example of an event function.

const { Client, BaseInteraction, PermissionsBitField } = require('discord.js');

const { ownerID, adminIDs, adminBypassIDs } = require('../../../configs/clientSettings.json');
const { communityServer } = require('../../../configs/heejinSettings.json');

const { BetterEmbed } = require('../../../modules/discordTools');
const logger = require('../../../modules/logger');

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

        // Create a base embed to send error messages
        let embed_error = new BetterEmbed({ interaction: args.interaction });

        // Get the slash command function from the client if it exists
        let slashCommand = client.slashCommands.get(args.interaction.commandName) || null;
        if (!slashCommand) return await embed_error.send({ description: "That is not a command" });

        // Execute the command
        try {
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
        } catch {

        }
    }
};