const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userManager } = require('../modules/mongo');
const { messageTools } = require('../modules/discordTools');
const { userInventory_ES } = require('../modules/embedStyles');
const { botSettings} = require('../configs/heejinSettings.json');
const { dateTools } = require('../modules/jsTools');

module.exports = {
    builder: new SlashCommandBuilder().setName("inventory").setDescription("View your card inventory")
        .addStringOption({ name: "set_id", description: "Filter by set ID" })
        .addStringOption({ name: "group_name", description: "Filter by group" })
        .addStringOption({
            name: "sorting", description: "Default - sorting: Set ID | order: Ascending", choices: [
                { name: "Global ID", value: "global" },
                { name: "Set ID", value: "set" }
            ]
        })
        .addStringOption({
            name: "order", description: "The order you want your inventory to be sorted", choices: [
                { name: "Ascending", value: "ascending" },
                { name: "Descending", value: "descending" }]
        }),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Get interaction options
        let setID = interaction.options.getNumber("set_id") || null;
        let group = interaction.options.getString("group_name") || null;
        if (group) group = group.toLowerCase();

        let sorting = interaction.options.getString("sorting") || "set";
        let order = interaction.options.getString("order") || "ascending";

        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id, "full", true);

        // Build the user's inventory pages
        let embed_inventory = userInventory_ES(userData, sorting, order);

        // Paginatation-ify-inator 9000!!!!!!
        return await messageTools.paginationify(interaction, embed_inventory, {
            timeout: dateTools.parseStr(botSettings.timeout.pagination)
        });
    }
};