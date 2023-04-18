const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userManager } = require('../modules/mongo');
const { cardInventoryParser } = require('../modules/userParser');
const cardManager = require('../modules/cardManager');

module.exports = {
    builder: new SlashCommandBuilder().setName("vault")
        .setDescription("Lock/unlock a card in your inventory")

        .addSubcommand(subcommand => subcommand.setName("add")
            .setDescription("Add a card in your inventory to your vault")
            .addStringOption(option => option.setName("uid")
                .setDescription("The unique ID of the card")
                .setRequired(true)))

        .addSubcommand(subcommand => subcommand.setName("remove")
            .setDescription("Remove a card in your inventory from your vault")
            .addStringOption(option => option.setName("uid")
                .setDescription("The unique ID of the card")
                .setRequired(true))),

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
        if (!card) return await interaction.editReply({ content: `\`${uid}\` is not a valid card ID.` });

        // Determine the operation type
        let result = "";
        switch (interaction.options.getSubcommand()) {
            case "add":
                card.locked = true;
                result = `${cardManager.toString.basic(cardManager.parse.fromCardLike(card))} has been locked.`;
                break;

            case "remove":
                card.locked = false;
                result = `${cardManager.toString.basic(cardManager.parse.fromCardLike(card))} has been unlocked.`;
                break;
        }

        // Update the user's card_inventory in Mongo
        await userManager.updateNested(interaction.user.id,
            { "card_inventory.uid": card.uid },
            { $set: { "card_inventory.$": card } }
        );

        // Let the user know the result
        return await interaction.editReply({ content: result });
    }
};