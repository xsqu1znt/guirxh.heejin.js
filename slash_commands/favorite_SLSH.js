const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userManager } = require('../modules/mongo');
const userParser = require('../modules/userParser');
const cardManager = require('../modules/cardManager');

module.exports = {
    builder: new SlashCommandBuilder().setName("favorite")
        .setDescription("Set a card as your favorite")

        .addStringOption(option => option.setName("uid")
            .setDescription("The unique ID of the card")
            .setRequired(true)),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Get interation options
        let uid = interaction.options.getString("uid");

        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id, "full", true);

        // Get the card from the user's card_inventory
        let card = userParser.cards.get(userData.card_inventory, uid);
        if (!card) return await interaction.editReply({ content: `\`${uid}\` is not a valid card ID.` });

        // Check if the card is already favorited
        if (card.uid === userData.card_favorite_uid) return await interaction.editReply({
            content: `\`${uid}\` is already favorited.`
        });

        // Update the user's card_favorite_uid in Mongo
        await userManager.update(interaction.user.id, { card_favorite_uid: card.uid });

        // Let the user know the result
        let card_f = cardManager.toString.basic(card);
        return await interaction.editReply({ content: `${card_f} set as favorite.` });
    }
};