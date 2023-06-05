const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { generalCollections_ES } = require('../modules/embedStyles');
const { EmbedNavigator } = require('../modules/discordTools');

module.exports = {
    builder: new SlashCommandBuilder().setName("collections")
        .setDescription("View a list of every set in the game")

        .addStringOption(option => option.setName("group")
            .setDescription("Filter by group"))

        .addStringOption(option => option.setName("category")
            .setDescription("Filter by category"))

        .addStringOption(option => option.setName("order")
            .setDescription("Default: Descending")
            .addChoices(
                { name: "Ascending", value: "ascending" },
                { name: "Descending", value: "descending" }
            )
        ),

    helpIcon: "📁",

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Get interaction options
        let group = interaction.options.getString("group") || null;
        if (group) group = group.toLowerCase();

        let category = interaction.options.getString("category") || null;
        if (category) category = category.toLowerCase();

        let order = interaction.options.getString("order") || null;

        // Build the set collection pages
        let embed_collections = generalCollections_ES(interaction.member, { order, filter: { group, category } });

        // Add navigation for the embeds
        let embedNav = new EmbedNavigator({
            interaction, embeds: [embed_collections], useReactionsForPagination: true,
            paginationType: "longJump", dynamicPagination: false
        });

        await embedNav.send();
    }
};