const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { globalShop_ES } = require('../modules/embedStyles');
const { messageTools } = require('../modules/discordTools');
const { dateTools } = require('../modules/jsTools');

module.exports = {
    builder: new SlashCommandBuilder().setName("shop")
        .setDescription("View the shop"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Build the set collection pages
        let embed_shop = globalShop_ES(interaction.user);

        // Paginatation-ify-inator 9000!!!!11
        return await messageTools.paginationify(interaction, embed_shop, {
            timeout: dateTools.parseStr(botSettings.timeout.pagination)
        });
    }
};