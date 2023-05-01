const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { userInventory_ES, userDuplicates_ES } = require('../modules/embedStyles');
const { messageTools } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');
const { dateTools } = require('../modules/jsTools');

module.exports = {
    builder: new SlashCommandBuilder().setName("inventory")
        .setDescription("View your card inventory")

        .addSubcommand(subcommand => subcommand.setName("all")
            .setDescription("View your cards")

            .addStringOption(option => option.setName("setid")
                .setDescription("Filter by set ID"))
            .addStringOption(option => option.setName("group")
                .setDescription("Filter by group name"))

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
            )
        )

        .addSubcommand(subcommand => subcommand.setName("dupes")
            .setDescription("View your duplicate cards")

            .addStringOption(option => option.setName("gid")
                .setDescription("The global ID of the card")
                .setRequired(true))
        ),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Get interaction options
        let globalID = interaction.options.getString("gid") || null;
        let setID = interaction.options.getString("setid") || null;
        let groupName = interaction.options.getString("group") || null;
        if (groupName) groupName = groupName.toLowerCase();

        let sorting = interaction.options.getString("sorting") || null;
        let order = interaction.options.getString("order") || null;

        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id, "full", true);

        // Create the embed
        let embed_view;

        // Determine the operation
        switch (interaction.options.getSubcommand()) {
            case "all":
                embed_view = userInventory_ES(interaction.user, userData, sorting, order, { setID, groupName });
                break;

            case "dupes":
                embed_view = userDuplicates_ES(interaction.user, userData, globalID);
                break;
        }

        // Navigateinator-ify-er 9000!!!!11
        return await new messageTools.Navigationify(interaction, embed_view, {
            timeout: dateTools.parseStr(botSettings.timeout.pagination),
            pagination: true
        }).send();
    }
};