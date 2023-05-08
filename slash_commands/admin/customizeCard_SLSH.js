const {
    Client, CommandInteraction, SlashCommandBuilder,
    ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');

// const { randomTools } = require('../modules/jsTools');

module.exports = {
    builder: new SlashCommandBuilder().setName("customizecard")
        .setDescription("Customize a user's card"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Create the modal
        let modal_customizeCard = new ModalBuilder()
            .setCustomId("modal_customizeCard")
            .setTitle("Customize Card");

        // Inputs
        let textInput_cardUID = new TextInputBuilder()
            .setCustomId("textInput_cardUID")
            .setLabel("The UID of the card")
            .setStyle(TextInputStyle.Short);

        let textInput_imageURL = new TextInputBuilder()
            .setCustomId("textInput_cardUID")
            .setLabel("The image you want to give the card")
            .setStyle(TextInputStyle.Short);
        
        // Action rows
        let actionRows = [
            new ActionRowBuilder().addComponents(textInput_cardUID),
            new ActionRowBuilder().addComponents(textInput_imageURL)
        ];

        // Add the action rows to the modal
        modal_customizeCard.addComponents(...actionRows);

        // Show the modal
        await interaction.showModal(modal_customizeCard);
    }
};