const {
    Client, CommandInteraction, SlashCommandBuilder, EmbedBuilder,
    ModalBuilder, TextInputBuilder, TextInputStyle, ChannelSelectMenuBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType
} = require('discord.js');

const { communityServer, botSettings } = require('../configs/heejinSettings.json');

module.exports = {
    options: { deferReply: false, guildAdminOnly: true },

    builder: new SlashCommandBuilder().setName("createembed")
        .setDescription("Create a custom embed")
        .addStringOption(option => option.setName("template")
            .setDescription("Choose from a template to start with")

            .addChoices(
                { name: "Board", value: "template_board" },
                { name: "Update", value: "template_update" }
            )
        ),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Create a base embed
        let embed = new EmbedBuilder()
            .setAuthor({ name: "Hi there!" })
            .setColor(botSettings.embed.color);

        let messageContent = "";
        let date = {
            year: new Date().getFullYear().toString().substring(2),
            month: new Date().getMonth().toString(),
            day: new Date().getDate().toString()
        };

        if (date.month.length === 1) date.month = `0${date.month}`;
        if (date.day.length === 1) date.day = `0${date.day}`;

        // Apply a template if given
        switch (interaction.options.getString("template")) {
            case "template_board":
                messageContent = "<@&911414367550074941>";

                embed.setAuthor({
                    name: `Overall Updates (${date.year}/${date.month}/${date.day})`,
                    iconURL: interaction.guild.members.me.user.avatarURL({ dynamic: true })
                });

                let description_board =
                    "-----------------------------\n\n" +

                    "A reminder you can invite anyone to join with this link:\n" +
                    `${communityServer.url}\n\n` +

                    "> \`⚠️\` **CUSTOMS ARE OPEN UNTIL null**\n" +
                    "> You can order up to 5 customs now! <#1030897348777365585>\n\n" +

                    "-----------------------------\n\n" +

                    "Here is a new poll of the week.\n\n" +

                    "*Theme is: **null***\n\n" +

                    "<:1one:919372432735879218> **null**\n" +
                    "<:2two:919372433184686140> **null**\n" +
                    "<:3three:919372433109164043> **null**\n" +
                    "<:4four:919372432677175406> **null**\n" +
                    "<:5five:919372432886870117> **null**\n" +
                    "<:6six:919372433067221022> **null**\n" +
                    "<:7seven:919372432698118144> **null**\n" +
                    "<:8eight:919372431418859560> **null**\n" +
                    "<:9nine:919372432291282966> **null**\n" +
                    "<:10ten:919372433025286175> **null**";

                embed.setDescription(description_board); break;

            case "template_update":
                messageContent = "<@&903998336980385813>";

                embed.setAuthor({
                    name: `New Weekly Collections (${date.year}/${date.month}/${date.day})`,
                    iconURL: interaction.guild.members.me.user.avatarURL({ dynamic: true })
                });

                let description_update =
                    "Hello hello! Here are the collections for this week! \`💕\`\n\n" +

                    "> \`comn\` **null** - null `000`\n" +
                    "> \`uncn\` **null** - null `000`\n" +
                    "> \`rare\` **null** - null `000`\n" +
                    "> \`epic\` **null** - null `000`\n" +
                    "> \`mint\` **null** - null `000`\n";

                embed.setDescription(description_update); break;
        }

        //* Create the modals
        let modal_customEmbed = new ModalBuilder()
            .setCustomId("modal_customEmbed")
            .setTitle("Custom Embed");

        // Inputs
        let components_modal = {
            edit: [
                new TextInputBuilder().setCustomId("mti_messageContent")
                    .setLabel("Message content (outside the embed):")
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(messageContent || " ")
                    .setMaxLength(2000)
                    .setRequired(false),

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

                new TextInputBuilder().setCustomId("mti_description")
                    .setLabel("Embed description:")
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(embed.data?.description || "")
                    .setMaxLength(4000)
                    .setRequired(false),

                new TextInputBuilder().setCustomId("mti_imageURL")
                    .setLabel("Embed image URL:")
                    .setStyle(TextInputStyle.Short)
                    .setValue(embed.data?.image?.url || "")
                    .setRequired(false)
            ]
        };

        // Action rows
        let actionRows_modal = {
            edit: components_modal.edit.map(component =>
                new ActionRowBuilder().addComponents(component)
            )
        };

        // Create the customizer's action row
        let buttons_customizer = {
            edit: new ButtonBuilder().setLabel("Edit")
                .setStyle(ButtonStyle.Secondary)
                .setCustomId("btn_edit"),

            confirm: new ButtonBuilder().setLabel("Confirm")
                .setStyle(ButtonStyle.Success)
                .setCustomId("btn_confirm"),

            cancel: new ButtonBuilder().setLabel("Cancel")
                .setStyle(ButtonStyle.Danger)
                .setCustomId("btn_cancel")
        };

        let actionRow_customizer = {
            edit: new ActionRowBuilder().addComponents(
                buttons_customizer.edit,
                buttons_customizer.confirm,
                buttons_customizer.cancel
            )
        };

        // Send the base embed
        let message = await interaction.editReply({
            embeds: [embed], components: [
                actionRow_customizer.edit
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
                    case "btn_edit":
                        // Set the modal components to be relevant to the button the user pressed
                        modal_customEmbed.setComponents(...actionRows_modal.edit);
                        // Show the modal
                        try { await i.showModal(modal_customEmbed); } catch { };

                        // Await the returned modal data
                        let modalSubmit_edit = await awaitModal();

                        // Change embed data
                        messageContent = modalSubmit_edit.fields.getTextInputValue("mti_messageContent");
                        let embedAuthorName = modalSubmit_edit.fields.getTextInputValue("mti_authorName");
                        let embedAuthorIconURL = modalSubmit_edit.fields.getTextInputValue("mti_authorIconURL");
                        let embedDescription = modalSubmit_edit.fields.getTextInputValue("mti_description");
                        let embedImageURL = modalSubmit_edit.fields.getTextInputValue("mti_imageURL");

                        components_modal.edit[0].setValue(messageContent);
                        components_modal.edit[1].setValue(embedAuthorName);
                        components_modal.edit[2].setValue(embedAuthorIconURL);
                        components_modal.edit[3].setValue(embedDescription);
                        components_modal.edit[4].setValue(embedImageURL);

                        if (messageContent) await message.edit({ content: messageContent });

                        if (embedAuthorName) embed.setAuthor({ name: embedAuthorName });

                        if (embedAuthorIconURL) try {
                            embed.setAuthor({ name: embed.data.author.name, iconURL: embedAuthorIconURL });
                        } catch {
                            await i.followUp({ content: `${i.user} that is an invalid author icon URL!`, ephemeral: true });
                            components_modal.edit[2].setValue("");
                        };

                        if (embedDescription) embed.setDescription(embedDescription);

                        if (embedImageURL) try {
                            embed.setImage(embedImageURL);
                        } catch {
                            await i.followUp({ content: `${i.user} that is an invalid image URL!`, ephemeral: true });
                            components_modal.edit[4].setValue("");
                        };

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