const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { arrayTools } = require('../modules/jsTools');
const { generalShop_ES } = require('../modules/embedStyles');
const { BetterEmbed, EmbedNavigator } = require('../modules/discordTools');

const { userManager } = require('../modules/mongo/index');

const cardManager = require('../modules/cardManager');
const userParser = require('../modules/userParser');
const shop = require('../modules/shop');

module.exports = {
    options: { icon: "🛍️", deferReply: false },

    builder: new SlashCommandBuilder().setName("shop")
        .setDescription("View the shop"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Create the shop pages
        let embed_shop = generalShop_ES(interaction.member);

        return await interaction.reply({ embeds: embed_shop.embeds });
    }
};