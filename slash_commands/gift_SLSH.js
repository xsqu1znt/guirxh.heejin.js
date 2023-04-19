const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { cardInventoryParser } = require('../modules/userParser');
const { userGift_ES } = require('../modules/embedStyles');
const { userManager } = require('../modules/mongo');
const cardManager = require('../modules/cardManager');

module.exports = {
    builder: new SlashCommandBuilder().setName("gift")
        .setDescription("Give a card to another player")

        .addStringOption(option => option.setName("uid")
            .setDescription("The unique ID of the card (separate multiple by comma - MAX 5)")
            .setRequired(true))

        .addUserOption(option => option.setName("player")
            .setDescription("The player you want to gift to")
            .setRequired(true)),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Get interaction options
        let recipient = interaction.options.getUser("player");

        let uids = interaction.options.getString("uid").replace(/ /g, "").split(",");
        if (!Array.isArray(uids)) uids = [uids];

        // Don't exceed the maximum number card that can be gifted at once
        if (uids.length > 5) return await interaction.editReply({
            content: "You can't gift more than \`5\` cards at once."
        });

        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id, "full", true);

        // Check if recipient user exists in Mongo
        let recipientExists = await userManager.exists(recipient.id);
        if (!recipientExists) return await interaction.editReply({
            content: "That user hasn't started yet."
        });

        // Get the cards from the user's card_inventory
        let cardsToGift = cardInventoryParser.getMultiple(userData.card_inventory, uids);

        // Filter out invalid cards
        cardsToGift = cardsToGift.filter(card => card);
        if (cardsToGift.length === 0) return await interaction.editReply({
            content: `No cards were found with ${uids.length === 1 ? "that ID" : "those IDs"}.`
        });

        // Filter out locked and favorited cards
        cardsToGift = cardsToGift.filter(card => card.uid !== userData.card_favorite_uid && !card?.locked);
        if (cardsToGift.length === 0) return await interaction.editReply({
            content: ` ${uids.length === 1 ? `\`${uids[0]}\` is locked/favorited` : "Those cards are locked/favorited"}.`
        });

        // Update the users' card_inventory in Mongo
        await Promise.all([
            // Add the card to the recipient's card_inventory
            userManager.cards.add(recipient.id, cardsToGift, true),
            // Remove the card from the gifter's card_inventory
            userManager.cards.remove(interaction.user.id, cardsToGift.map(card => card.uid))
        ]);

        // Create the embed
        let embed_gift = userGift_ES(interaction.user, recipient, cardsToGift);

        // Let the user know the result
        return await interaction.editReply({ embeds: [embed_gift] });
    }
};