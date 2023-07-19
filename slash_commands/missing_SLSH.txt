const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userMissing_ES } = require('../modules/embedStyles');
const { EmbedNavigator } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');

module.exports = {
    options: { icon: "❌", deferReply: true },

    builder: new SlashCommandBuilder().setName("missing")
        .setDescription("See which cards you're missing in a set")

        .addStringOption(option => option.setName("setid")
            .setDescription("The ID of the set")
            .setRequired(true)),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Get interaction options
        let setID = interaction.options.getString("setid");

        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id, "full", true);

        // Create the embed
        let embeds_missing = userMissing_ES(interaction.member, userData, setID);

        let embedNav = new EmbedNavigator({
            interaction, embeds: [embeds_missing], useReactionsForPagination: true,
            paginationType: "shortJump"
        });

        // Send the embeds with navigation
        return await embedNav.send();
    }
};