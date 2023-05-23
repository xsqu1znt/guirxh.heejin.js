const { Client, CommandInteraction, SlashCommandBuilder, time, TimestampStyles } = require('discord.js');

const { communityServer } = require('../configs/heejinSettings.json');
const { BetterEmbed, messageTools: { Navigationify }, markdown: { inline, link } } = require('../modules/discordTools');
const { numberTools, stringTools, dateTools } = require('../modules/jsTools');
const { userManager } = require('../modules/mongo');
const cardManager = require('../modules/cardManager');

module.exports = {
    builder: new SlashCommandBuilder().setName("info")
        .setDescription("View useful info"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // A base embed template
        let page_template = () => new BetterEmbed({
            author: { text: "%AUTHOR_NAME | info", user: interaction.user },
        });

        //! Page -> Summary
        let embed_summary = () => {
            // Create the base embed from the template
            let _embed = page_template();

            let _description = "";
            _description += `${link("Join our official server!", communityServer.url)}\n\n`;
            _description += "\`01.\` \`🐇\` **Heejin Info**\n> *View information about Heejin*\n";
            _description += "\`02.\` \`👥\` **Player Info** \n> *View information about yourself*\n";
            _description += "\`03.\` \`📣\` **Server Info** \n> *View information about the server*\n";

            _embed.setDescription(_description); return _embed;
        };

        //! Page -> Heejin Information
        let embed_heejin = async () => {
            // Heejin
            let heejin = interaction.guild.members.me;
            let bday = numberTools.milliToSeconds(heejin.user.createdTimestamp + dateTools.parseStr("1y"));

            /// Player base
            let userCount = await userManager.count();
            let guildCount = client.guilds.cache.size;

            let cardCount = cardManager.cardCount;

            /// Technical
            let joinedServer = time(numberTools.milliToSeconds(heejin.joinedTimestamp), TimestampStyles.RelativeTime);
            let uptime = time(numberTools.milliToSeconds(Date.now() - client.uptime), TimestampStyles.RelativeTime);
            let ping = client.ws.ping;

            // Create the base embed from the template
            let _embed = page_template();

            // Show heejin's upcoming birthday
            _embed.setDescription(`\`🎂 Birthday:\` ${time(bday, TimestampStyles.LongDate)}`);

            // Infomational fields
            _embed.addFields(
                {
                    name: "Player Base", value: ">>> %USER_COUNT\n%GUILD_COUNT\n%CARD_COUNT\n%CARDS_DROPPED"
                        .replace("%USER_COUNT", `${inline("👥", "Players:")} ${inline(userCount)}`)
                        .replace("%GUILD_COUNT", `${inline("📣", "Servers:")} ${inline(guildCount)}`)

                        .replace("%CARD_COUNT", `${inline("🃏", "Cards:")} ${inline(cardCount)}`)
                        .replace("%CARDS_DROPPED", `${inline("🃏", "Dropped:")} ${inline("999")}`),
                    inline: true
                },

                {
                    name: "Technical", value: ">>> %JOINED\n%UPTIME\n%PING"
                        .replace("%JOINED", `${inline("📆", "Joined:")} ${joinedServer}`)
                        .replace("%UPTIME", `${inline("⏱", "Uptime:")} ${uptime}`)
                        .replace("%PING", `${inline("⌛", "Ping:")} ${inline(`${ping}ms`)}`),
                    inline: true
                }
            ); return _embed;
        };

        // Create an array of info pages
        let embed_pages = [embed_summary(), await embed_heejin()];

        // Create a navigationify instance
        let navigationify = new Navigationify(interaction, embed_pages, { selectMenu: true });

        // Add select menu options
        navigationify.addSelectMenuOption({ emoji: "🔖", label: "Summary", description: "View the summary", isDefault: true });
        navigationify.addSelectMenuOption({ emoji: "🐇", label: "Heejin Info", description: "View information about Heejin" });
        navigationify.addSelectMenuOption({ emoji: "👥", label: "Player Info", description: "View information about yourself" });
        navigationify.addSelectMenuOption({ emoji: "📣", label: "Server Info", description: "View information about the server" });

        // Send the pages with navigation
        return await navigationify.send();
    }
};