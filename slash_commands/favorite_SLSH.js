const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userManager } = require('../modules/mongo');
const { messageTools } = require('../modules/discordTools');
const userParser = require('../modules/userParser');
const cardManager = require('../modules/cardManager');

module.exports = {
    builder: new SlashCommandBuilder().setName("favorite")
        .setDescription("Set a card as your favorite")

        .addStringOption(option => option.setName("uid")
            .setDescription("The unique ID of the card | use \"reset\" to unfavorite")
            .setRequired(true)),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Reusable embedinator to send success/error messages
        const embedinator = new messageTools.Embedinator(interaction, {
            title: "%USER | favorite", author: interaction.user
        });

        // Get interation options
        let uid = interaction.options.getString("uid");

        // Unfavorite the card if the user requested
        if (uid.toLowerCase() === "reset") {
            await userManager.update(interaction.user.id, { card_favorite_uid: "" });
            
            return await embedinator.send("Favorite card reset.");
        }

        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id, "full", true);

        // Get the card from the user's card_inventory
        let card = userParser.cards.get(userData.card_inventory, uid);
        if (!card) return await embedinator.send(
            `\`${uid}\` is not a valid card ID.`
        );

        // Check if the card is already favorited
        if (card.uid === userData.card_favorite_uid) return await embedinator.send(
            `\`${uid}\` is already favorited.`
        );

        // Update the user's card_favorite_uid in Mongo
        await userManager.update(interaction.user.id, { card_favorite_uid: card.uid });

        // Let the user know the result
        let card_f = cardManager.toString.basic(card);
        return await embedinator.send(`Your favorite card has been changed to:\n> ${card_f}`);
    }
};