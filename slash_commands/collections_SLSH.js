const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { globalCollections_ES } = require('../modules/embedStyles');
const { messageTools } = require('../modules/discordTools');
const { dateTools } = require('../modules/jsTools');

module.exports = {
    builder: new SlashCommandBuilder().setName("collections")
        .setDescription("View a list of every set that exists")

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
        let embed_collections = globalCollections_ES(interaction.user, { order, filter: { group, category } });

        // Paginatation-ify-inator 9000!!!!11
        return await messageTools.paginationify(interaction, embed_collections, {
            timeout: dateTools.parseStr(botSettings.timeout.pagination)
        });
    }
};