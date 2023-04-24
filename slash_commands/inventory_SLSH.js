const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { userInventory_ES } = require('../modules/embedStyles');
const { messageTools } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');
const { dateTools } = require('../modules/jsTools');

module.exports = {
    builder: new SlashCommandBuilder().setName("inventory")
        .setDescription("View your card inventory")

        .addStringOption(option => option.setName("set_id").setDescription("Filter by set ID"))
        .addStringOption(option => option.setName("group_name").setDescription("Filter by group"))

        .addStringOption(option => option.setName("sorting")
            .setDescription("Default: Set ID")
            .addChoices(
                { name: "Global ID", value: "global" },
                { name: "Set ID", value: "set" }
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
        let setID = interaction.options.getString("set_id") || null;
        let groupName = interaction.options.getString("group_name") || null;
        if (groupName) groupName = groupName.toLowerCase();

        let sorting = interaction.options.getString("sorting") || null;
        let order = interaction.options.getString("order") || null;

        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id, "full", true);

        // Build the user's inventory pages
        let embed_inventory = userInventory_ES(interaction.user, userData, sorting, order, { setID, groupName });

        // Paginatation-ify-inator 9000!!!!11
        return await messageTools.paginationify(interaction, embed_inventory, {
            timeout: dateTools.parseStr(botSettings.timeout.pagination)
        });
    }
};