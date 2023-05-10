const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { userMissing_ES } = require('../modules/embedStyles');
const { messageTools } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');
const { dateTools } = require('../modules/jsTools');

module.exports = {
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
        let embed_missing = userMissing_ES(interaction.user, userData, setID);

        // Navigateinator-ify-er 9000!!!!11
        return await new messageTools.Navigationify(interaction, [embed_missing], {
            timeout: dateTools.parseStr(botSettings.timeout.pagination),
            pagination: true
        }).send();
    }
};