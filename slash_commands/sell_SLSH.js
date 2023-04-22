const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { messageTools } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');
const userParser = require('../modules/userParser');
const cardManager = require('../modules/cardManager');

module.exports = {
    builder: new SlashCommandBuilder().setName("sell")
        .setDescription("Sell a card in your inventory")

        .addStringOption(option => option.setName("uid")
            .setDescription("The unique ID of the card (separate multiple by comma)")
            .setRequired(true)),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Reusable embedinator to send success/error messages
        const embedinator = new messageTools.Embedinator(interaction, {
            title: "%USER | sell", author: interaction.user
        });

        // Get interaction options
        let uids = interaction.options.getString("uid").replace(/ /g, "").split(",");
        if (!Array.isArray(uids)) uids = [uids];

        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id, "full", true);

        // Get the cards from the user's card_inventory
        let cardsToRemove = userParser.cards.getMultiple(userData.card_inventory, uids);
        if (cardsToRemove.length === 0) return await embedinator.send(
            `No cards were found with ${uids.length === 1 ? "that ID" : "those IDs"}.`
        );

        // Remove the cards from the user's card_inventory
        await userManager.cards.remove(interaction.user.id, cardsToRemove.map(card => card.uid));

        // Update the user's balance with the total sell amount
        let currencyGained = 0; cardsToRemove.forEach(card => currencyGained += card.sellPrice);
        await userManager.update(interaction.user.id, { balance: userData.balance + currencyGained });

        // Let the user know the result
        let result = `You sold \`${cardsToRemove.length}\` cards and received \`${botSettings.currencyIcon} ${currencyGained}\`.`;

        if (cardsToRemove.length === 1) {
            // Parse the card into a human readable format
            let card_f = cardManager.toString.basic(cardsToRemove[0]);

            result = `You sold ${card_f} and received \`${botSettings.currencyIcon} ${currencyGained}\`.`;
        }

        return await embedinator.send(result);
    }
};