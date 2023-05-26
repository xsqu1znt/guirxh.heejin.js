const { Client, CommandInteraction, SlashCommandBuilder, time, TimestampStyles } = require('discord.js');

const { communityServer } = require('../configs/heejinSettings.json');
const { BetterEmbed, EmbedNavigation, messageTools: { Navigationify }, markdown: { inline, link } } = require('../modules/discordTools');
const { numberTools, stringTools, dateTools } = require('../modules/jsTools');
const { userManager } = require('../modules/mongo');
const cardManager = require('../modules/cardManager');

module.exports = {
    builder: new SlashCommandBuilder().setName("information")
        .setDescription("View useful information"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let botMember = interaction.guild.members.me;

        // A base embed template
        let embed_template = () => new BetterEmbed({
            author: { text: "%AUTHOR_NAME | information", user: interaction.user }
        });

        //! Page -> Summary
        let embed_summary = () => {
            // Create the base embed from the template
            let _embed = embed_template();

            let _description = "";
            _description += `${link("Join our official server!", communityServer.url)}\n\n`;
            _description += "\`01.\` \`🐇\` **Heejin Info**\n> *View information about Heejin*\n";
            _description += "\`02.\` \`👥\` **Player Info** \n> *View information about yourself*\n";
            _description += "\`03.\` \`📣\` **Server Info** \n> *View information about the server*\n";

            _embed.setDescription(_description); return _embed;
        };

        //! Page -> Heejin Information
        let embed_heejin = async () => {
            // About me
            let bday = numberTools.milliToSeconds(botMember.user.createdTimestamp + dateTools.parseStr("1y"));

            /// Player base
            let userCount = await userManager.count();
            let guildCount = client.guilds.cache.size;

            let cardCount = cardManager.cardCount;

            /// Technical
            let uptime = time(numberTools.milliToSeconds(Date.now() - client.uptime), TimestampStyles.RelativeTime);
            let ping = client.ws.ping;

            // Create the base embed from the template
            let _embed = embed_template();

            // Set the embed thumbnail
            _embed.setThumbnail(interaction.guild.members.me.user.avatarURL({ dynamic: true }));

            // Set the embed description
            let _description = "";
            _description += `\`🎂 birthday\` ${time(bday, TimestampStyles.LongDate)}\n\n`;
            _description += `> ${link("Join our official server!", communityServer.url)}\n\u200b`;

            _embed.setDescription(_description);

            // Infomational fields
            _embed.addFields(
                {
                    name: "\`📝\` Basic Information", value: ">>> %CARD_COUNT\n%USER_COUNT\n%GUILD_COUNT"
                        .replace("%CARD_COUNT", `\`🃏 cards\` ${cardCount}`)
                        .replace("%USER_COUNT", `\`👥 users\` ${userCount}`)
                        .replace("%GUILD_COUNT", `\`📣 servers\` ${guildCount}`),
                    inline: true
                },
                {
                    name: "\`💁\` Bot Team", value: ">>> %OWNER\n%DEVELOPER\n%DESIGNERS"
                        .replace("%OWNER", "\`🌸 owner\` <@797233513136390175>")
                        .replace("%DEVELOPER", "\`🦑 developer\` <@842555247145779211>")
                        .replace("%DESIGNERS", "\`👩‍🎨 designers\` <@797233513136390175> <@668835955687424050> <@607643855323660310> <@428873096888320013>"),
                    inline: true
                },
                {
                    name: "\`📃\` Inside Information", value: ">>> %UPTIME\n%PING"
                        .replace("%UPTIME", `\`⏱ uptime\` ${uptime}`)
                        .replace("%PING", `\`⌛ ping\` ${ping}ms`)
                }
            ); return _embed;
        };

        let embed_player = () => {
            // Create the base embed from the template
            let _embed = embed_template();

            // Set the embed thumbnail
            _embed.setThumbnail(interaction.user.avatarURL({ dynamic: true }));

            // Set the embed description
            let _description = "";
            _description += `${link("Join our official server!", communityServer.url)}\n\n`;

            _embed.setDescription(_description);

            return _embed;
        };

        let embed_server = async () => {
            let guildIcon = interaction.guild.iconURL({ dynamic: true });
            let guildJoined = time(numberTools.milliToSeconds(botMember.joinedTimestamp), TimestampStyles.RelativeTime);

            let playerIDs = (await userManager.fetch(null, "id", true)).map(user => user._id);
            let playersInGuild = interaction.guild.members.cache.filter(gm => playerIDs.includes(gm.id)).size;

            // Create the base embed from the template
            let _embed = embed_template();

            // Set the embed thumbnail
            _embed.setThumbnail(guildIcon);

            // Set the embed description
            let _description = "";
            _description += `> ${link("Join our official server!", communityServer.url)}\n\n`;

            _embed.setDescription(_description);

            // Infomational fields
            _embed.addFields(
                {
                    name: "Category", value: ">>> %JOINED\n%ACTIVE_PLAYER_COUNT"
                        .replace("%JOINED", `\`📆 joined\` ${guildJoined}`)
                        .replace("%ACTIVE_PLAYER_COUNT", `\`👥 players\` ${playersInGuild}`),
                    inline: true
                }
            ); return _embed;
        };

        // Create an array of info pages
        let embed_pages = [embed_summary(), await embed_heejin(), embed_player(), await embed_server()];

        // Add navigation for the embeds
        let embedNav = new EmbedNavigation({ interaction, embeds: embed_pages, selectMenu: true });

        embedNav.addToSelectMenu({ emoji: "🔖", label: "Summary", description: "View the summary" });
        embedNav.addToSelectMenu({ emoji: "🐇", label: "Heejin Info", description: "View information about Heejin" });
        embedNav.addToSelectMenu({ emoji: "👥", label: "Player Info", description: "View information about yourself" });
        embedNav.addToSelectMenu({ emoji: "📣", label: "Server Info", description: "View information about the server" });

        // Send the embed pages
        return await embedNav.send();
    }
};