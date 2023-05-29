const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { userInventory_ES, userDuplicates_ES } = require('../modules/embedStyles');
const { EmbedNavigator, messageTools } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');
const { dateTools } = require('../modules/jsTools');

module.exports = {
    builder: new SlashCommandBuilder().setName("inventory")
        .setDescription("View your card inventory")

        .addStringOption(option => option.setName("dupes")
            .setDescription("View your dupes using GID")
        )

        .addStringOption(option => option.setName("setid")
            .setDescription("Filter by SETID"))
        .addStringOption(option => option.setName("group")
            .setDescription("Filter by GROUP"))

        .addStringOption(option => option.setName("sorting")
            .setDescription("Default: SETID")

            .addChoices(
                { name: "🃏 GID", value: "global" },
                { name: "🗣️ SETID", value: "set" }
            )
        )

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
        let globalID = interaction.options.getString("dupes") || null;
        let setID = interaction.options.getString("setid") || null;
        let groupName = interaction.options.getString("group") || null;
        if (groupName) groupName = groupName.toLowerCase();

        let sorting = interaction.options.getString("sorting") || null;
        let order = interaction.options.getString("order") || null;

        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id, "full", true);

        // Create the embed
        let embed_view;

        // Determine the operation type
        if (globalID) embed_view = userDuplicates_ES(interaction.user, userData, globalID);
        else embed_view = userInventory_ES(interaction.user, userData, sorting, order, { setID, groupName });

        let embedNav = new EmbedNavigator({ interaction, embeds: [embed_view], paginationType: "shortJump" });

        // Send the embeds with navigation
        return await embedNav.send();
    }
};