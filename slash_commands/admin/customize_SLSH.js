const {
    Client, CommandInteraction, SlashCommandBuilder,
    ModalBuilder, TextInputBuilder, TextInputStyle,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType
} = require('discord.js');

const { messageTools } = require('../../modules/discordTools');
const { userManager } = require('../../modules/mongo');
const userParser = require('../../modules/userParser');
const cardManager = require('../../modules/cardManager');

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
            editInfo: [
                new TextInputBuilder().setCustomId("mti_name")
                    .setLabel("The card's name:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(card.name)
                    .setRequired(false),

                new TextInputBuilder().setCustomId("mti_description")
                    .setLabel("The card's description:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(card.description)
                    .setRequired(false),
                
                new TextInputBuilder().setCustomId("mti_group")
                    .setLabel("The group the card is in:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(card.group)
                    .setRequired(false),

                new TextInputBuilder().setCustomId("mti_single")
                    .setLabel("The single the card is from:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(card.single)
                    .setRequired(false),

                new TextInputBuilder().setCustomId("mti_category")
                    .setLabel("The category the card is in:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(card.category)
                    .setRequired(false)
            ],

            editDetails: [
                new TextInputBuilder().setCustomId("mti_setid")
                    .setLabel("The set ID the card belongs to:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(card.setID)
                    .setRequired(false),

                new TextInputBuilder().setCustomId("mti_gid")
                    .setLabel("The global ID of the card:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(card.globalID)
                    .setRequired(false),
                
                    new TextInputBuilder().setCustomId("mti_sellPrice")
                    .setLabel("The price the card can be sold for:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(String(card.sellPrice))
                    .setRequired(false)
            ],

            changeImage: [
                new TextInputBuilder().setCustomId("mti_imageURL")
                    .setLabel("The card's image URL:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(card.imageURL)
                    .setRequired(false)
            ]
        };

        // Action rows
        let actionRows_modal = {
            editInfo: components_modal.editInfo.map(textInput =>
                new ActionRowBuilder().addComponents(textInput)
            ),

            editDetails: components_modal.editDetails.map(textInput =>
                new ActionRowBuilder().addComponents(textInput)
            ),

            changeImage: components_modal.changeImage.map(textInput =>
                new ActionRowBuilder().addComponents(textInput)
            )
        };

        //* Create the customizer embed
        let embed = embed_customize.embed
            .setDescription(card_f + `\n\n> ${card.description}`)
            .setImage(card.imageURL)
            .setFooter({ text: "Use the buttons below to customize the card" });

        // Create the customizer's action row
        let buttons_customizer = {
            editInfo: new ButtonBuilder().setLabel("Edit Info")
                .setStyle(ButtonStyle.Secondary)
                .setCustomId("btn_editInfo"),

            editDetails: new ButtonBuilder().setLabel("Edit Details")
                .setStyle(ButtonStyle.Secondary)
                .setCustomId("btn_editDetails"),

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

        let actionRows_customizer = {
            edit: new ActionRowBuilder().addComponents(
                buttons_customizer.editInfo,
                buttons_customizer.editDetails,
                buttons_customizer.changeImage
            ),

            confirmCancel: new ActionRowBuilder().addComponents(
                buttons_customizer.confirm,
                buttons_customizer.cancel
            )
        };

        // Send the customize embed
        let message = await interaction.editReply({
            embeds: [embed], components: [
                actionRows_customizer.edit,
                actionRows_customizer.confirmCancel
            ]
        });

        //! Collect button interactions
        // Create a filter to look for only button interactions from the user that ran this command
        let filter = i => (i.componentType === ComponentType.Button) && (i.user.id === interaction.user.id);
        // Create a collector to catch interactions | timeout after 5 minutes
        let collector = message.createMessageComponentCollector({ filter, time: 300000 });

        // Refreshes the card info displayed in the embed
        let refreshEmbed = async () => {
            // Re-parse the edited card into a human readable string
            card_f = cardManager.toString.inventory(card);

            // Change the embed's description and image to display the card
            embed.setDescription(card_f + `\n\n> ${card.description}`).setImage(card.imageURL);

            // Edit the message with the updated embed data
            await message.edit({ embeds: [embed] }); return null;
        }

        // Wait for the modal to be submitted and return the modal interaction
        let awaitModal = async () => {
            // Create a filter to look for the right modal
            let modalSubmit_filter = i => i.customId === modal_customize.data.custom_id;
            // Create a collector to catch the modal submit | timeout after 5 minutes
            let modalSubmit = await interaction.awaitModalSubmit({ filter: modalSubmit_filter, time: 300000 });

            // Close the modal
            await modalSubmit.deferUpdate();

            // Return the modal interaction
            return modalSubmit;
        }

        // Triggered whenever a button is pressed in the connected message
        collector.on("collect", async i => {
            // Resets the collector timer
            collector.resetTimer();

            switch (i.customId) {
                // Show the modal for editing basic info
                case "btn_editInfo":
                    // Set the modal components to be relevant to the button the user pressed
                    modal_customize.setComponents(...actionRows_modal.editInfo);
                    // Show the modal
                    await i.showModal(modal_customize);

                    // Await the returned modal data
                    let modalSubmit_editInfo = await awaitModal();

                    // Change card data
                    let cardName = modalSubmit_editInfo.fields.getTextInputValue("mti_name");
                    let cardDescription = modalSubmit_editInfo.fields.getTextInputValue("mti_description");
                    let cardGroup = modalSubmit_editInfo.fields.getTextInputValue("mti_group");
                    let cardSingle = modalSubmit_editInfo.fields.getTextInputValue("mti_single");
                    let cardCategory = modalSubmit_editInfo.fields.getTextInputValue("mti_category");

                    card.name = cardName; components_modal.editInfo[0].setValue(cardName);
                    card.description = cardDescription; components_modal.editInfo[1].setValue(cardDescription);
                    card.group = cardGroup; components_modal.editInfo[2].setValue(cardGroup);
                    card.single = cardSingle; components_modal.editInfo[3].setValue(cardSingle);
                    card.category = cardCategory; components_modal.editInfo[4].setValue(cardCategory);

                    return await refreshEmbed();

                case "btn_editDetails":
                    // Set the modal components to be relevant to the button the user pressed
                    modal_customize.setComponents(...actionRows_modal.editDetails);
                    // Show the modal
                    await i.showModal(modal_customize);

                    // Await the returned modal data
                    let modalSubmit_editDetails = await awaitModal();

                    // Change card data
                    let cardSetID = modalSubmit_editDetails.fields.getTextInputValue("mti_setid");
                    let cardGlobalID = modalSubmit_editDetails.fields.getTextInputValue("mti_gid");
                    let cardSellPrice = modalSubmit_editDetails.fields.getTextInputValue("mti_sellPrice");

                    card.setID = cardSetID; components_modal.editDetails[0].setValue(cardSetID);
                    card.globalID = cardGlobalID; components_modal.editDetails[1].setValue(cardGlobalID);
                    card.sellPrice = +cardSellPrice; components_modal.editDetails[2].setValue(cardSellPrice);

                    return await refreshEmbed();

                case "btn_changeImage":
                    // Set the modal components to be relevant to the button the user pressed
                    modal_customize.setComponents(...actionRows_modal.changeImage);
                    // Show the modal
                    await i.showModal(modal_customize);

                    // Await the returned modal data
                    let modalSubmit_changeImage = await awaitModal();

                    // Change card data
                    let cardImageURL = modalSubmit_changeImage.fields.getTextInputValue("mti_imageURL");

                    card.imageURL = cardImageURL; components_modal.changeImage[0].setValue(cardImageURL);

                    return await refreshEmbed();

                case "btn_confirm":
                    // Allow the button to know it was submitted
                    i.deferUpdate();

                    // Update the user's card in Mongo
                    userManager.cards.update(userID, card);

                    // Let the user know the result
                    await new messageTools.Embedinator(interaction, {
                        title: "%USER | customize",
                        description: `Successfully edited card \`${uid}\` for user \`${userID}\``,
                        author: interaction.author
                    }).send(null, { followUp: true });

                    // End the collector
                    collector.stop(); return;

                case "btn_cancel":
                    // Delete the customize message
                    try { await message.delete(); } catch { };

                    // End the collector
                    collector.stop(); return;
            }
        });

        // Delete the message on timeout
        collector.on("end", async () => {
            try { await message.edit({ components: [] }); } catch { };
        });
    }
};