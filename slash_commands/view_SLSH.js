const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userManager } = require('../modules/mongo');
const { cardInventoryParser } = require('../modules/userParser');
const { userView_ES } = require('../modules/embedStyles');

module.exports = {
    builder: new SlashCommandBuilder().setName("view")
        .setDescription("View a card in your inventory")

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
        let card = cardInventoryParser.get(userData.card_inventory, uid);
        if (!card) return interaction.editReply({ content: `\`${uid}\` is not a valid card ID.` });

        // Create the embed
        let embed_view = userView_ES(interaction.user, userData, card);

        // Send the embed
        return await interaction.editReply({ embeds: [embed_view] });
    }
};