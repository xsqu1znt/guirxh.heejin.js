const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userManager } = require('../modules/mongo');
const { messageTools } = require('../modules/discordTools');
const { userView_ES } = require('../modules/embedStyles');
const cardManager = require('../modules/cardManager');
const userParser = require('../modules/userParser');

module.exports = {
    builder: new SlashCommandBuilder().setName("idol")
        .setDescription("The card you level up when you use /stage")

        .addSubcommand(subcommand => subcommand.setName("view")
            .setDescription("View the card you have set for /stage")
        )

        .addSubcommand(subcommand => subcommand.setName("set")
            .setDescription("Set a card to level up using /stage")

            .addStringOption(option => option.setName("uid")
                .setDescription("The unique ID of the card | use \"reset\" to deselect")
                .setRequired(true))
        ),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Reusable embedinator to send success/error messages
        const embedinator = new messageTools.Embedinator(interaction, {
            title: "%USER | idol", author: interaction.user
        });

        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id, "full", true);

        // Determine the operation
        switch (interaction.options.getSubcommand()) {
            case "view":
                // Get the card from the user's card_inventory
                let card_view = userParser.cards.get(userData.card_inventory, userData.card_selected_uid);
                if (!card_view) return await embedinator.send(
                    `You don't have a card selected. Use **/idol set** first.`
                );

                // Create the embed
                let embed_view = userView_ES(interaction.user, userData, card_view, "idol");

                // Send the embed
                return await interaction.editReply({ embeds: [embed_view] });

            case "set":
                // Get interation options
                let uid = interaction.options.getString("uid");

                // Deselect the card if the user requested
                if (uid.toLowerCase() === "reset") {
                    await userManager.update(interaction.user.id, { card_selected_uid: "" });

                    return await embedinator.send("Selected idol reset.");
                }

                // Get the card from the user's card_inventory
                let card_toSet = userParser.cards.get(userData.card_inventory, uid);
                if (!card_toSet) return await embedinator.send(
                    `\`${uid}\` is not a valid card ID.`
                );

                // Check if the card is already selected
                if (card_toSet.uid === userData.card_selected_uid) return await embedinator.send(
                    `\`${uid}\` is already selected.`
                );

                // Update the user's card_favorite_uid in Mongo
                await userManager.update(interaction.user.id, { card_selected_uid: card_toSet.uid });

                // Let the user know the result
                let card_toSet_f = cardManager.toString.basic(card_toSet);
                // return await interaction.editReply({ content: `${card_toSet_f} is now selected.` });
                return await embedinator.send(`Idol has been changed to:\n> ${card_toSet_f}`);
        }
    }
};