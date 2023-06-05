const { Client, CommandInteraction, time, TimestampStyles } = require('discord.js');

const { BetterEmbed, EmbedNavigator, markdown: { bold, inline, link } } = require('../../../modules/discordTools');
const { arrayTools, numberTools } = require('../../../modules/jsTools');
const logger = require('../../../modules/logger');

module.exports = {
    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let embed_error = new BetterEmbed({
            interaction, author: { text: "%AUTHOR_NAME | servers", user: interaction.member },
            description: "Could not fetch guilds"
        });

        // Get interaction options
        let serverID = interaction.options.getString("leave") || null;

        // Fetch all the guilds the client's currently in
        let guilds_partial = await client.guilds.fetch();

        //* Try to leave the server if an ID is given
        if (serverID) try {
            // Fetch the server based on the given ID
            let guildToLeave = await guilds_partial.find(guild => guild.id === serverID).fetch();

            // Leave the server
            await guildToLeave.leave();

            // Log the leave
            logger.success(`successfully left server (${serverID})`);

            // Let the user know the result
            return await embed_error.send({ description: `Successfully left server: ${inline(true, "🆔", serverID)}` });
        } catch (err) {
            // Log the error
            logger.error("Could not leave server", `server id: ${serverID}`, err);

            // Let the user know that the server couldn't be left
            return await embed_error.send({ description: `Failed to leave server: ${inline(true, "🆔", serverID)}` });
        }

        //* Show the servers the client's currently in
        // Fetch each guild to get the full guild object
        let guilds_full = await Promise.all(guilds_partial.map(guild => guild.fetch()));

        // Sort by join date
        guilds_full = guilds_full.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);

        // Parse each guild into a human readable string
        let guilds_full_f = await Promise.all(guilds_full.map(async (guild, idx) => {
            let invite_url = "";

            try {
                // Fetch the inviteManager from the guild
                // only works if the client has the Manage Server permission in that guild
                let inviteManager = await guild.invites.fetch();

                // Get the first active invite in the guild
                let invite = inviteManager.at(0);

                // Create a new temp invite if an invite doesn't already exist | expires in 5 minutes
                invite ||= await guild.invites.create(guild.systemChannelId, {
                    maxAge: 60 * 5,
                    maxUses: 1
                });

                // Get the invite url
                if (invite) invite_url = invite.url;
            } catch (err) {
                // Log the error
                // logger.error("Could not create server invite", `server id: ${serverID}`, err);
            }

            // Return a formatted guild string
            return "%IDX %GUILD_NAME ・ %GUILD_ID\n> %MEMBER_COUNT : \`📆\` %JOINED"
                .replace("%IDX", inline(`${idx + 1}.`))
                .replace("%GUILD_NAME", bold(invite_url ? link(guild.name, invite_url) : guild.name))
                .replace("%GUILD_ID", inline("🆔", guild.id))
                .replace("%MEMBER_COUNT", inline("👥", guild.memberCount))
                .replace("%JOINED", time(
                    numberTools.milliToSeconds(guild.members.me.joinedTimestamp),
                    TimestampStyles.LongDate
                ));
        }));

        // Break up the formatted servers to only show 10 per page
        guilds_full_f = arrayTools.chunk(guilds_full_f, 10);

        // Create a page for each chunk
        let embeds_servers = [];
        for (let chunk of guilds_full_f) {
            let _embed = new BetterEmbed({
                author: { text: "%AUTHOR_NAME | servers", user: interaction.member },
                description: chunk.join("\n")
            });

            embeds_servers.push(_embed);
        }

        // Send the embed with navigation
        let embedNav = new EmbedNavigator({ interaction, embeds: [embeds_servers], paginationType: "shortJump" });
        return await embedNav.send();
    }
};