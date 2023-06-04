const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { userInventory_ES, userInventory_dupes_ES } = require('../modules/embedStyles');
const { EmbedNavigator } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');

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
        .addStringOption(option => option.setName("name")
            .setDescription("Filter by NAME"))

        .addStringOption(option => option.setName("sorting")
            .setDescription("Default: SETID")

            .addChoices(
                { name: "🃏 GID", value: "global" },
                { name: "🗣️ SETID", value: "set" }
            )
        )

        .addStringOption(option => option.setName("order")
            .setDescription("Default: Ascending")

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
        //Interaction options
        let globalID = interaction.options.getString("dupes");
        let setID = interaction.options.getString("setid");
        let group = interaction.options.getString("group"); group &&= group.toLowerCase();
        let name = interaction.options.getString("name"); name &&= name.toLowerCase();

        let sorting = interaction.options.getString("sorting") || "set";
        let order = interaction.options.getString("order") || "ascending";

        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id, "full", true);

        // Create the embeds
        let embed_inventory;

        if (globalID) embed_inventory = userInventory_dupes_ES(interaction.member, userData, globalID);
        else embed_inventory = userInventory_ES(interaction.member, userData,
            { setID, group, name, sorting, order }
        );

        // Send the embeds with navigation
        let embedNav = new EmbedNavigator({
            interaction, embeds: [embed_inventory],
            paginationType: "longJump", useReactionsForPagination: true
        });

        return await embedNav.send();
    }
};