const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { cardInventoryParser } = require('../modules/userParser');
const { userManager } = require('../modules/mongo');
const cardManager = require('../modules/cardManager');

module.exports = {
    builder: new SlashCommandBuilder().setName("gift")
        .setDescription("Give a card to another player")

        .addStringOption(option => option.setName("uid")
            .setDescription("The unique ID of the card (separate multiple by comma)")
            .setRequired(true)),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Get interaction options
        let uids = interaction.options.getString("uid").replace(/ /g, "").split(",");
        if (!Array.isArray(uids)) uids = [uids];

        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id, "full", true);

        // Get the cards from the user's card_inventory
        let cardsToGift = cardInventoryParser.getMultiple(userData.card_inventory, uids);

        // Filter out invalid cards
        cardsToGift = cardsToGift.filter(card => card);
        if (cardsToGift.length === 0) return await interaction.editReply({
            content: `No cards were found with ${uids.length === 1 ? "that ID" : "those IDs"}.`
        });
    }
};