const {
    Client, CommandInteraction, SlashCommandBuilder,
    EmbedBuilder,
    ModalBuilder, TextInputBuilder, TextInputStyle, ChannelSelectMenuBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType
} = require('discord.js');

module.exports = {
    builder: new SlashCommandBuilder().setName("embed")
        .setDescription("Create a custom embed"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Create a base embed
        let embed = new EmbedBuilder()
            .setTitle("Embed")
            .setFooter({ text: "Use the buttons below to customize the embed." })
            .setColor("Random");

        //* Create the modals
        let modal_customEmbed = new ModalBuilder()
            .setCustomId("modal_customEmbed")
            .setTitle("Customize Embed");

        // Inputs
        let components_modal = {
            editDetails: [
                new TextInputBuilder().setCustomId("mti_title")
                    .setLabel("The embed's title: ")
                    .setStyle(TextInputStyle.Short)
                    .setValue(embed.data.title)
                    .setMaxLength(256)
                    .setRequired(false),

                new TextInputBuilder().setCustomId("mti_description")
                    .setLabel("The embed's description:")
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(embed.data.description || "")
                    .setMaxLength(4000)
                    .setRequired(false),

                new TextInputBuilder().setCustomId("mti_imageURL")
                    .setLabel("The embed's image:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(embed.data?.image?.url || "")
                    .setRequired(false),

                new TextInputBuilder().setCustomId("mti_color")
                    .setLabel("The embed's color:")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
            ],

            editFooter: [
                new TextInputBuilder().setCustomId("mti_footerText")
                    .setLabel("The embed's footer text:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(embed.data.footer.text || "")
                    .setMaxLength(2048)
                    .setRequired(false),

                new TextInputBuilder().setCustomId("mti_footerIconURL")
                    .setLabel("The embed's footer icon URL:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(embed.data.footer.icon_url || "")
                    .setRequired(false)
            ]
        };

        // Action rows
        let actionRows_modal = {
            editDetails: components_modal.editDetails.map(component =>
                new ActionRowBuilder().addComponents(component)
            ),

            editFooter: components_modal.editFooter.map(component =>
                new ActionRowBuilder().addComponents(component)
            )
        };

        // Create the customizer's action row
        let buttons_customizer = {
            editDetails: new ButtonBuilder().setLabel("Edit Details")
                .setStyle(ButtonStyle.Secondary)
                .setCustomId("btn_editDetails"),

            editFooter: new ButtonBuilder().setLabel("Edit Footer")
                .setStyle(ButtonStyle.Secondary)
                .setCustomId("btn_editFooter"),

            toggleTimestamp: new ButtonBuilder().setLabel("Toggle Timestamp")
                .setStyle(ButtonStyle.Secondary)
                .setCustomId("btn_toggleTimestamp"),

            confirm: new ButtonBuilder().setLabel("Confirm")
                .setStyle(ButtonStyle.Success)
                .setCustomId("btn_confirm"),

            cancel: new ButtonBuilder().setLabel("Cancel")
                .setStyle(ButtonStyle.Danger)
                .setCustomId("btn_cancel")
        };

        let actionRow_customizer = {
            edit: new ActionRowBuilder().addComponents(
                buttons_customizer.editDetails,
                buttons_customizer.editFooter,
                buttons_customizer.toggleTimestamp
            ),

            confirmCancel: new ActionRowBuilder().addComponents(
                buttons_customizer.confirm,
                buttons_customizer.cancel
            )
        };

        // Send the base embed
        let message = await interaction.editReply({
            embeds: [embed], components: [
                actionRow_customizer.edit,
                actionRow_customizer.confirmCancel
            ]
        });

        //! Collect button interactions
        // Create a filter to look for only button interactions from the user that ran this command
        let filter = i => (i.componentType === ComponentType.Button) && (i.user.id === interaction.user.id);
        // Create a collector to catch interactions | timeout after 5 minutes
        let collector = message.createMessageComponentCollector({ filter, time: 300000 });

        // Refreshes the card info displayed in the embed
        let refreshEmbed = async () => {
            // Edit the message with the updated embed data
            try { await message.edit({ embeds: [embed] }); } catch { };
        }

        // Wait for the modal to be submitted and return the modal interaction
        let awaitModal = async () => {
            // Create a filter to look for the right modal
            let modalSubmit_filter = i => i.customId === modal_customEmbed.data.custom_id;
            // Create a collector to catch the modal submit | timeout after 5 minutes
            let modalSubmit = await interaction.awaitModalSubmit({ filter: modalSubmit_filter, time: 300000 });

            // Close the modal
            try { await modalSubmit.deferUpdate(); } catch { };

            // Return the modal interaction
            return modalSubmit;
        }

        // Triggered whenever a button is pressed in the connected message
        collector.on("collect", async i => {
            // Resets the collector timer
            collector.resetTimer();

            switch (i.customId) {
                // Show the modal for editing basic info
                case "btn_editDetails":
                    // Set the modal components to be relevant to the button the user pressed
                    modal_customEmbed.setComponents(...actionRows_modal.editDetails);
                    // Show the modal
                    try { await i.showModal(modal_customEmbed); } catch { };

                    // Await the returned modal data
                    let modalSubmit_editDetails = await awaitModal();

                    // Change embed data
                    let embedTitle = modalSubmit_editDetails.fields.getTextInputValue("mti_title");
                    let embedDescription = modalSubmit_editDetails.fields.getTextInputValue("mti_description");
                    let embedImageURL = modalSubmit_editDetails.fields.getTextInputValue("mti_imageURL");
                    let embedColor = modalSubmit_editDetails.fields.getTextInputValue("mti_color");
                    if (embedColor && !embedColor.startsWith("#")) embedColor = `#${embedColor}`;

                    if (embedTitle) embed.setTitle(embedTitle);
                    if (embedDescription) embed.setDescription(embedDescription);
                    if (embedImageURL) embed.setImage(embedImageURL);
                    if (embedColor) embed.setColor(embedColor);

                    components_modal.editDetails[0].setValue(embedTitle);
                    components_modal.editDetails[1].setValue(embedDescription);
                    components_modal.editDetails[2].setValue(embedImageURL);
                    components_modal.editDetails[3].setValue(embedColor);

                    return await refreshEmbed();

                case "btn_editFooter":
                    // Set the modal components to be relevant to the button the user pressed
                    modal_customEmbed.setComponents(...actionRows_modal.editFooter);
                    // Show the modal
                    try { await i.showModal(modal_customEmbed); } catch { };

                    // Await the returned modal data
                    let modalSubmit_editFooter = await awaitModal();

                    // Change embed data
                    let embedFooterText = modalSubmit_editFooter.fields.getTextInputValue("mti_footerText");
                    let embedFooterIconURL = modalSubmit_editFooter.fields.getTextInputValue("mti_footerIconURL");

                    if (embedFooterText) embed.setFooter({ text: embedFooterText });
                    if (embedFooterIconURL) embed.setFooter({ text: embed.data.footer.text, iconURL: embedFooterIconURL });

                    components_modal.editFooter[0].setValue(embedFooterText);
                    components_modal.editFooter[1].setValue(embedFooterIconURL);

                    return await refreshEmbed();

                case "btn_toggleTimestamp":
                    // Toggle on/off the embed's timestamp
                    if (embed.data.timestamp) embed.setTimestamp(null);
                    else embed.setTimestamp(Date.now());

                    // Allow the button to know it was submitted
                    i.deferUpdate();

                    return await refreshEmbed();

                case "btn_confirm":
                    // Allow the button to know it was submitted
                    i.deferUpdate();

                    // Send a "followUp" message asking where the user wants to send their custom embed
                    let message_channelSelect = await message.reply({
                        components: [new ActionRowBuilder().addComponents(
                            new ChannelSelectMenuBuilder().setCustomId("csm_channelSelect")
                                .setPlaceholder("What channel(s) do you want to send this embed to?")
                                .setMinValues(1)
                                .setMaxValues(5)
                        )]
                    });

                    //? Get the channels from the "followUp" message
                    // Create a filter to look for only channel select interactions from the user that ran this command
                    let filter_channels = ii =>
                        (ii.componentType === ComponentType.ChannelSelect)
                        && (ii.user.id === interaction.user.id);

                    // Create a collector to catch interactions | timeout after 15 seconds
                    return await message_channelSelect.awaitMessageComponent({ filter: filter_channels, time: 15000 })
                        .then(async ii => {
                            // Send the custom embed to the selected channels
                            ii.channels.forEach(channel => channel.send({ embeds: [embed] }));

                            // Delete the channel select message
                            try { await message_channelSelect.delete(); } catch { };

                            // End the button collector
                            collector.stop();
                        }).catch(async (err) => {
                            // Log the error
                            console.error(err);

                            // Delete the channel select message
                            try { await message_channelSelect.delete(); } catch { };
                        });

                case "btn_cancel": collector.stop(); return;
            }
        });

        // Delete the message on timeout
        collector.on("end", async () => {
            try { await message.delete(); } catch { };
        });
    }
};