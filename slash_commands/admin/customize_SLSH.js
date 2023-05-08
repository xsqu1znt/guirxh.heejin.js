const {
    Client, CommandInteraction, SlashCommandBuilder,
    ModalBuilder, TextInputBuilder, TextInputStyle,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType
} = require('discord.js');

// const { randomTools } = require('../modules/jsTools');
const { messageTools } = require('../../modules/discordTools');
const { userManager } = require('../../modules/mongo');
const cardManager = require('../../modules/cardManager');
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
        // dontDefer: true
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
        let userData = await userManager.fetch(userID, "cards", true);

        // Check if the card exists
        let card = userParser.cards.get(userData.card_inventory, uid);
        if (!card) return embed_customize.send(
            `\`${uid}\` is not a valid uid`
        );

        // Parse the card into a human readable string
        let card_f = cardManager.toString.inventory(card);

        //* Create the modals
        let modal_customize = new ModalBuilder()
            .setCustomId("modal_customize")
            .setTitle("Customize Card");

        // Inputs
        let components_modal = {
            basicInfo: [
                new TextInputBuilder().setCustomId("mti_name")
                    .setLabel("The card's name:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(card.name)
                    .setRequired(true),

                new TextInputBuilder().setCustomId("mti_description")
                    .setLabel("The card's description:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(card.description)
                    .setRequired(true),
            ],

            inventoryDetails: [
                new TextInputBuilder().setCustomId("mti_group")
                    .setLabel("The group the card is in:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(card.group)
                    .setRequired(true),

                new TextInputBuilder().setCustomId("mti_single")
                    .setLabel("The single the card is from:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(card.single)
                    .setRequired(true),

                new TextInputBuilder().setCustomId("mti_category")
                    .setLabel("The category the card is in:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(card.category)
                    .setRequired(true)
            ],

            changeImage: [
                new TextInputBuilder().setCustomId("mti_imageURL")
                    .setLabel("The card's image URL:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(card.imageURL)
                    .setRequired(true)
            ]
        };

        // Action rows
        let actionRow_modal = {
            basicInfo: components_modal.basicInfo.map(textInput =>
                new ActionRowBuilder().addComponents(textInput)
            ),

            inventoryDetails: components_modal.inventoryDetails.map(textInput =>
                new ActionRowBuilder().addComponents(textInput)
            ),

            changeImage: components_modal.changeImage.map(textInput =>
                new ActionRowBuilder().addComponents(textInput)
            )
        };

        //* Create the customizer embed
        let embed = embed_customize.embed
            .setDescription(card_f)
            .setImage(card.imageURL)
            .setFooter({ text: "Use the buttons below to customize the card" });

        // Create the customizer's action row
        let buttons_customizer = {
            basicInfo: new ButtonBuilder().setLabel("Basic Info")
                .setStyle(ButtonStyle.Secondary)
                .setCustomId("btn_basicInfo"),

            inventoryDetails: new ButtonBuilder().setLabel("Inventory Details")
                .setStyle(ButtonStyle.Secondary)
                .setCustomId("btn_inventoryDetails"),

            changeImage: new ButtonBuilder().setLabel("Change Image")
                .setStyle(ButtonStyle.Secondary)
                .setCustomId("btn_changeImage"),

            confirm: new ButtonBuilder().setLabel("Confirm")
                .setStyle(ButtonStyle.Success)
                .setCustomId("btn_confirm"),

            cancel: new ButtonBuilder().setLabel("Cancel")
                .setStyle(ButtonStyle.Danger)
                .setCustomId("btn_cancel")
        };

        let actionRow_customizer = {
            edit: new ActionRowBuilder().addComponents(
                buttons_customizer.basicInfo,
                buttons_customizer.inventoryDetails,
                buttons_customizer.changeImage
            ),

            confirmCancel: new ActionRowBuilder().addComponents(
                buttons_customizer.confirm,
                buttons_customizer.cancel
            )
        };

        // Send the embed
        let message = await interaction.reply({
            embeds: [embed], components: [
                actionRow_customizer.edit,
                actionRow_customizer.confirmCancel
            ]
        });

        //* Collect button interactions
        let filter = i => (i.componentType === ComponentType.Button) && (i.user.id === interaction.user.id);
        let collector = message.createMessageComponentCollector({ filter, time: 30000 });

        // Refreshes the card info displayed in the embed
        let refreshEmbed = async () => {
            card_f = cardManager.toString.inventory(card);

            embed.setDescription(card_f).setImage(card.imageURL);
            message.edit({ embeds: [embed] });
        }

        // Wait for the modal to be submitted and return the modal interaction
        let awaitModal = async () => {
            // Wait for the modal to be submitted and return the interaction
            let modalSubmit_filter = i => i.customId === modal_customize.data.custom_id;
            let modalSubmit = await interaction.awaitModalSubmit({ filter: modalSubmit_filter, time: 30000 });

            // Close the modal
            await modalSubmit.deferUpdate();

            // Return the modal interaction
            return modalSubmit;
        }

        collector.on("collect", async i => {
            collector.resetTimer();

            switch (i.customId) {
                // Show the modal for editing basic info
                case "btn_basicInfo":
                    modal_customize.setComponents(...actionRow_modal.basicInfo);
                    await i.showModal(modal_customize);

                    let modalSubmit_basicInfo = await awaitModal();

                    // Update card data
                    card.name = modalSubmit_basicInfo.fields.getTextInputValue("mti_name");
                    card.description = modalSubmit_basicInfo.fields.getTextInputValue("mti_description");

                    return await refreshEmbed();

                case "btn_inventoryDetails":
                    modal_customize.setComponents(...actionRow_modal.inventoryDetails);
                    await i.showModal(modal_customize);

                    let modalSubmit_inventoryDetails = await awaitModal();

                    // Update card data
                    card.group = modalSubmit_inventoryDetails.fields.getTextInputValue("mti_group");
                    card.single = modalSubmit_inventoryDetails.fields.getTextInputValue("mti_single");
                    card.category = modalSubmit_inventoryDetails.fields.getTextInputValue("mti_category");

                    return await refreshEmbed();

                case "btn_changeImage":
                    modal_customize.setComponents(...actionRow_modal.changeImage);
                    await i.showModal(modal_customize);

                    let modalSubmit_changeImage = await awaitModal();

                    // Update card data
                    card.imageURL = modalSubmit_changeImage.fields.getTextInputValue("mti_imageURL");

                    return await refreshEmbed();

                case "btn_confirm": collector.stop(); return;
                case "btn_cancel": collector.stop(); return;
            }
        });

        // Remove the action row on timeout/confirm/cancel
        collector.on("end", async () => {
            try { await message.edit({ components: [] }); } catch { };
        });
    }
};