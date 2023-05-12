const {
    Client, CommandInteraction, SlashCommandBuilder, EmbedBuilder,
    ModalBuilder, TextInputBuilder, TextInputStyle, ChannelSelectMenuBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType
} = require('discord.js');

module.exports = {
    builder: new SlashCommandBuilder().setName("createembed")
        .setDescription("Create a custom embed"),

    requireGuildAdmin: true,

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Create a base embed
        let embed = new EmbedBuilder()
            .setTitle("Embed")
            .setColor("Random");

        //* Create the modals
        let modal_customEmbed = new ModalBuilder()
            .setCustomId("modal_customEmbed")
            .setTitle("Custom Embed");

        // Inputs
        let components_modal = {
            editContent: [
                new TextInputBuilder().setCustomId("mti_messageContent")
                    .setLabel("Message content (outside the embed):")
                    .setStyle(TextInputStyle.Paragraph)
                    .setMaxLength(2000)
                    .setRequired(false),

                new TextInputBuilder().setCustomId("mti_title")
                    .setLabel("Embed title: ")
                    .setStyle(TextInputStyle.Short)
                    .setValue(embed.data?.title)
                    .setMaxLength(256)
                    .setRequired(false),

                new TextInputBuilder().setCustomId("mti_description")
                    .setLabel("Embed description:")
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(embed.data?.description || "")
                    .setMaxLength(4000)
                    .setRequired(false),

                new TextInputBuilder().setCustomId("mti_thumbnailURL")
                    .setLabel("Embed thumbnail URL:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(embed.data?.thumbnail?.url || "")
                    .setRequired(false),

                new TextInputBuilder().setCustomId("mti_imageURL")
                    .setLabel("Embed image URL:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(embed.data?.image?.url || "")
                    .setRequired(false)
            ],

            editDetails: [
                new TextInputBuilder().setCustomId("mti_authorName")
                    .setLabel("Embed author name:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(embed.data?.author?.name || "")
                    .setMaxLength(256)
                    .setRequired(false),

                new TextInputBuilder().setCustomId("mti_authorIconURL")
                    .setLabel("Embed author icon URL:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(embed.data?.author?.icon_url || "")
                    .setRequired(false),

                new TextInputBuilder().setCustomId("mti_titleURL")
                    .setLabel("Embed title URL (makes title a link):")
                    .setStyle(TextInputStyle.Short)
                    .setValue(embed.data?.url || "")
                    .setRequired(false),

                new TextInputBuilder().setCustomId("mti_footerText")
                    .setLabel("Embed footer text:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(embed.data?.footer?.text || "")
                    .setMaxLength(2048)
                    .setRequired(false),

                new TextInputBuilder().setCustomId("mti_footerIconURL")
                    .setLabel("Embed footer icon URL:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(embed.data?.footer?.icon_url || "")
                    .setRequired(false)
            ],

            setColor: [
                new TextInputBuilder().setCustomId("mti_color")
                    .setLabel("Embed color:")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
            ],
        };

        // Action rows
        let actionRows_modal = {
            editContent: components_modal.editContent.map(component =>
                new ActionRowBuilder().addComponents(component)
            ),

            editDetails: components_modal.editDetails.map(component =>
                new ActionRowBuilder().addComponents(component)
            ),

            setColor: components_modal.setColor.map(component =>
                new ActionRowBuilder().addComponents(component)
            )
        };

        // Create the customizer's action row
        let buttons_customizer = {
            editContent: new ButtonBuilder().setLabel("Edit Content")
                .setStyle(ButtonStyle.Secondary)
                .setCustomId("btn_editContent"),

            editDetails: new ButtonBuilder().setLabel("Edit Details")
                .setStyle(ButtonStyle.Secondary)
                .setCustomId("btn_editDetails"),

            setColor: new ButtonBuilder().setLabel("Set Color")
                .setStyle(ButtonStyle.Secondary)
                .setCustomId("btn_setColor"),

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
                buttons_customizer.editContent,
                buttons_customizer.editDetails
            ),

            edit2: new ActionRowBuilder().addComponents(
                buttons_customizer.toggleTimestamp,
                buttons_customizer.setColor
            ),

            confirmCancel: new ActionRowBuilder().addComponents(
                buttons_customizer.confirm,
                buttons_customizer.cancel
            )
        };

        // Send the base embed
        let messageContent = "";
        let message = await interaction.editReply({
            embeds: [embed], components: [
                actionRow_customizer.edit,
                actionRow_customizer.edit2,
                actionRow_customizer.confirmCancel
            ]
        });

        //! Collect button interactions
        // Create a filter to look for only button interactions from the user that ran this command
        let filter = i => {
            let passed = (i.componentType === ComponentType.Button) && (i.user.id === interaction.user.id);

            // Allow the button to know it was submitted and tell the user they can't use it
            // only if the interaction is from a user that didn't run the command
            if (!passed) try {
                i.deferUpdate().then(async ii =>
                    await i.followUp({ content: `${i.user} that button isn't for you!`, ephemeral: true })
                );
            } catch { };

            return passed;
        };

        // Create a collector to catch interactions | timeout after 10 minutes
        let collector = message.createMessageComponentCollector({ filter, time: 600000 });

        // Refreshes the card info displayed in the embed
        let refreshEmbed = async () => {
            // Edit the message with the updated embed data
            try { await message.edit({ embeds: [embed] }); } catch { };
        }

        // Wait for the modal to be submitted and return the modal interaction
        let awaitModal = async () => {
            // Create a filter to look for the right modal
            let modalSubmit_filter = i => i.customId === modal_customEmbed.data.custom_id;
            // Create a collector to catch the modal submit | timeout after 10 minutes
            let modalSubmit = await interaction.awaitModalSubmit({ filter: modalSubmit_filter, time: 600000 });

            // Reset the collector timer
            collector.resetTimer();

            // Close the modal
            try { await modalSubmit.deferUpdate(); } catch { };

            // Return the modal interaction
            return modalSubmit;
        }

        // Triggered whenever a button is pressed in the connected message
        collector.on("collect", async i => {
            // Reset the collector timer
            collector.resetTimer();

            try {
                switch (i.customId) {
                    case "btn_editContent":
                        // Set the modal components to be relevant to the button the user pressed
                        modal_customEmbed.setComponents(...actionRows_modal.editContent);
                        // Show the modal
                        try { await i.showModal(modal_customEmbed); } catch { };

                        // Await the returned modal data
                        let modalSubmit_editContent = await awaitModal();

                        // Change embed data
                        messageContent = modalSubmit_editContent.fields.getTextInputValue("mti_messageContent");
                        let embedTitle = modalSubmit_editContent.fields.getTextInputValue("mti_title");
                        let embedDescription = modalSubmit_editContent.fields.getTextInputValue("mti_description");
                        let embedThumbnailURL = modalSubmit_editContent.fields.getTextInputValue("mti_thumbnailURL");
                        let embedImageURL = modalSubmit_editContent.fields.getTextInputValue("mti_imageURL");

                        components_modal.editContent[0].setValue(messageContent);
                        components_modal.editContent[1].setValue(embedTitle);
                        components_modal.editContent[2].setValue(embedDescription);
                        components_modal.editContent[3].setValue(embedThumbnailURL);
                        components_modal.editContent[4].setValue(embedImageURL);

                        if (messageContent) await message.edit({ content: messageContent });
                        if (embedTitle) embed.setTitle(embedTitle);
                        if (embedDescription) embed.setDescription(embedDescription);
                        if (embedThumbnailURL) try {
                            embed.setThumbnail(embedThumbnailURL);
                        } catch {
                            await i.followUp({ content: `${i.user} that is an invalid thumbnail URL!`, ephemeral: true });
                            components_modal.editContent[3].setValue("");
                        };
                        if (embedImageURL) try {
                            embed.setImage(embedImageURL);
                        } catch {
                            await i.followUp({ content: `${i.user} that is an invalid image URL!`, ephemeral: true });
                            components_modal.editContent[4].setValue("");
                        };

                        return await refreshEmbed();

                    case "btn_editDetails":
                        // Set the modal components to be relevant to the button the user pressed
                        modal_customEmbed.setComponents(...actionRows_modal.editDetails);
                        // Show the modal
                        try { await i.showModal(modal_customEmbed); } catch { };

                        // Await the returned modal data
                        let modalSubmit_editDetails = await awaitModal();

                        // Change embed data
                        let embedAuthorName = modalSubmit_editDetails.fields.getTextInputValue("mti_authorName");
                        let embedAuthorIconURL = modalSubmit_editDetails.fields.getTextInputValue("mti_authorIconURL");
                        let embedTitleURL = modalSubmit_editDetails.fields.getTextInputValue("mti_titleURL");
                        let embedFooterText = modalSubmit_editDetails.fields.getTextInputValue("mti_footerText");
                        let embedFooterIconURL = modalSubmit_editDetails.fields.getTextInputValue("mti_footerIconURL");

                        components_modal.editDetails[0].setValue(embedAuthorName);
                        components_modal.editDetails[1].setValue(embedAuthorIconURL);
                        components_modal.editDetails[2].setValue(embedTitleURL);
                        components_modal.editDetails[3].setValue(embedFooterText);
                        components_modal.editDetails[4].setValue(embedFooterIconURL);

                        if (embedAuthorName) embed.setAuthor({ name: embedAuthorName });
                        if (embedAuthorIconURL) try {
                            embed.setAuthor({ name: embed.data.author.name, iconURL: embedAuthorIconURL });
                        } catch {
                            await i.followUp({ content: `${i.user} that is an invalid author icon URL!`, ephemeral: true });
                            components_modal.editDetails[1].setValue("");
                        };
                        if (embedTitleURL) try {
                            embed.setURL(embedTitleURL);
                        } catch {
                            await i.followUp({ content: `${i.user} that is an invalid title URL!`, ephemeral: true });
                            components_modal.editDetails[2].setValue("");
                        };
                        if (embedFooterText) embed.setFooter({ text: embedFooterText });
                        if (embedFooterIconURL) try {
                            embed.setFooter({ text: embed.data?.footer?.text || "", iconURL: embedFooterIconURL });
                        } catch {
                            await i.followUp({ content: `${i.user} that is an invalid footer URL!`, ephemeral: true });
                            components_modal.editDetails[4].setValue("");
                        };

                        return await refreshEmbed();

                    case "btn_setColor":
                        // Set the modal components to be relevant to the button the user pressed
                        modal_customEmbed.setComponents(...actionRows_modal.setColor);
                        // Show the modal
                        try { await i.showModal(modal_customEmbed); } catch { };

                        // Await the returned modal data
                        let modalSubmit_setColor = await awaitModal();

                        // Change embed data
                        let embedColor = modalSubmit_setColor.fields.getTextInputValue("mti_color");

                        if (embedColor) try { embed.setColor(embedColor); } catch {
                            return await i.followUp({ content: `${i.user} that is an invalid color!`, ephemeral: true });
                        };

                        components_modal.setColor[0].setValue(embedColor);

                        return await refreshEmbed();

                    case "btn_toggleTimestamp":
                        // Allow the button to know it was submitted
                        try { i.deferUpdate(); } catch { };

                        // Toggle on/off the embed's timestamp
                        if (embed.data.timestamp) embed.setTimestamp(null);
                        else embed.setTimestamp(Date.now());

                        return await refreshEmbed();

                    case "btn_confirm":
                        // Allow the button to know it was submitted
                        try { i.deferUpdate(); } catch { };

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

                        // Create a collector to catch interactions | timeout after 5 minutes
                        return await message_channelSelect.awaitMessageComponent({ filter: filter_channels, time: 300000 })
                            .then(async ii => {
                                // Send the custom embed to the selected channels
                                ii.channels.forEach(channel => channel.send({ content: messageContent, embeds: [embed] }));

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
            } catch (err) { }
        });

        // Delete the message on timeout
        collector.on("end", async () => {
            try { await message.delete(); } catch { };
        });
    }
};