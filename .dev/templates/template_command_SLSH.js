const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { BetterEmbed, EmbedNavigation } = require('../../modules/discordTools');

module.exports = {
    options: { icon: "🥕", deferReply: true, botAdminOnly: true },

    builder: new SlashCommandBuilder().setName("template")
        .setDescription("Template command"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        /// Create the embeds
        // duplicate this "new BetterEmbed()" code to make multiple embeds
        let embed_1 = new BetterEmbed({
            interaction, author: { text: "%AUTHOR_NAME | template", user: interaction.member },
            description: "description"
        });

        /// Add page navigation
        // to add more pages, add each embed above to "embeds: []"
        // i.e "embeds: [embed_1, embed_2]"
        let embedNav = new EmbedNavigation({ interaction, embeds: [embed_1], paginationType: "shortJump" });

        // Send the embed with navigation
        return await embedNav.send();
    }
};