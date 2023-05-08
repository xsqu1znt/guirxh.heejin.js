const {
    Client, CommandInteraction, SlashCommandBuilder,
    ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');

// const { randomTools } = require('../modules/jsTools');
const { userManager } = require('../../modules/mongo');
const userParser = require('../../modules/userParser');

module.exports = {
    builder: new SlashCommandBuilder().setName("customize")
        .setDescription("Customize a card in a user's inventory")

        .addStringOption(option => option.setName("userid")
            .setDescription("ID of the user")
            .setRequired(true)
        )

        .addStringOption(option => option.setName("uid")
            .setDescription("UID of the card")
            .setRequired(true)
        ),

    options: {
        botAdminOnly: true
    },

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let embed_customize = new messageTools.Embedinator(interaction, {
            title: "%USER | customize", author: interaction.user
        });

        // Get interaction options
        let userID = interaction.options.getString("userid");
        let uid = interaction.options.getString("uid");

        // Check if the user exists in the database
        if (!await userManager.exists(userID)) return embed_customize.send(
            "That user has not started yet"
        );

        // Fetch the user's card_inventory
        let userData = await userManager.fetch(userID, "cards", lean);

        // Check if the card exists
        let card = userParser.cards.get(userData.card_inventory, uid);
        if (!card) return embed_customize.send(
            `\`${uid}\` is not a valid uid`
        );

        //! Create the modal
        let modal_customizeCard = new ModalBuilder()
            .setCustomId("modal_customize")
            .setTitle("Customize Card");

        // Inputs
        let modalInputs = {

        }



        let textInput_cardUID = new TextInputBuilder()
            .setCustomId("textInput_uid")
            .setLabel("The UID of the card")
            .setStyle(TextInputStyle.Short);

        let textInput_imageURL = new TextInputBuilder()
            .setCustomId("textInput_imageURl")
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
        console.log(await interaction.showModal(modal_customizeCard));
    }
};