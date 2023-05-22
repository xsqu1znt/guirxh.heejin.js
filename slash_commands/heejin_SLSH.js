const { Client, CommandInteraction, SlashCommandBuilder, time, TimestampStyles } = require('discord.js');

const { communityServer } = require('../configs/heejinSettings.json');
const { BetterEmbed, messageTools: { Navigationify }, markdown: { inline } } = require('../modules/discordTools');
const { numberTools, stringTools, dateTools } = require('../modules/jsTools');
const { userManager } = require('../modules/mongo');
const cardManager = require('../modules/cardManager');

module.exports = {
    builder: new SlashCommandBuilder().setName("information")
        .setDescription("View information"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Create the base embed template
        let page_template = () => new BetterEmbed({
            author: { text: "%AUTHOR_NAME | heejin", user: interaction.user },
        });

        let embed_pages = [];

        // Create a navigationify instance
        let navigationify = new Navigationify(interaction, embed_pages, { selectMenu: true });

        // Add select menu options
        navigationify.addSelectMenuOption({ label: "Summary", description: "View the summary", isDefault: true });
        navigationify.addSelectMenuOption({ label: "Heejin Information", description: "View information about Heejin" });
        navigationify.addSelectMenuOption({ label: "Player Information", description: "View information about yourself" });
        navigationify.addSelectMenuOption({ label: "Server Information", description: "View information about the server" });
        // navigationify.addSelectMenuOption({ label: "Bot Information", description: "View information about the bot" });
        // navigationify.addSelectMenuOption({ label: "Heejin Handbook", description: "View useful information about the commands" });

        //! Page -> Summary
        let embed_summary = page_template();

        let summaryDescription = "";
        summaryDescription += "\`01.\` \`🗣️\` **Heejin Information**\n> *View information about Heejin*\n";
        summaryDescription += "\`02.\` \`🗣️\` **Player Information** \n> *View information about yourself*\n";
        summaryDescription += "\`03.\` \`🗣️\` **Server Information** \n> *View information about the server*\n";

        embed_summary.setDescription(summaryDescription);

        // Add the embeds to the page array
        embed_pages.push(embed_summary);

        // Send the pages with navigation
        return await navigationify.send();

        /* // Issa me! Heejin
        let heejin = interaction.guild.members.me;

        // Heejin
        let bday = numberTools.milliToSeconds(heejin.user.createdTimestamp + dateTools.parseStr("1y"));

        /// Player base
        let userCount = await userManager.count();
        let guildCount = client.guilds.cache.size;

        let cardCount = cardManager.cardCount;

        /// Technical
        let joinedServer = time(numberTools.milliToSeconds(heejin.joinedTimestamp), TimestampStyles.RelativeTime);
        let uptime = time(numberTools.milliToSeconds(Date.now() - client.uptime), TimestampStyles.RelativeTime);
        let ping = Math.floor(client.ws.ping);

        // Change embed's description
        embed_botInfo.setDescription(`\`🎂 Birthday:\` ${time(bday, TimestampStyles.LongDate)}`);

        // Display fields
        embed_botInfo.addFields(
            {
                name: "Summary", value: ">>> %USER_COUNT\n%GUILD_COUNT\n%CARD_COUNT"
                    .replace("%USER_COUNT", `${inline("👥", "Players:")} ${inline(userCount)}`)
                    .replace("%GUILD_COUNT", `${inline("📣", "Servers:")} ${inline(guildCount)}`)

                    .replace("%CARD_COUNT", `${inline("🃏", "Cards:")} ${inline(cardCount)}`),
                inline: true
            },

            {
                name: "Technical", value: ">>> %JOINED\n%UPTIME\n%PING"
                    .replace("%JOINED", `${inline("📆", "Joined:")} ${joinedServer}`)
                    .replace("%UPTIME", `${inline("⏱", "Uptime:")} ${uptime}`)
                    .replace("%PING", `${inline("⌛", "Ping:")} ${inline(`${ping}ms`)}`),
                inline: true
            }
        ); */
    }
};