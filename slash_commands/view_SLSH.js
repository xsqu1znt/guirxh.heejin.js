const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userManager } = require('../modules/mongo');
const { messageTools } = require('../modules/discordTools');
const { userView_ES } = require('../modules/embedStyles');
const cardManager = require('../modules/cardManager');
const userParser = require('../modules/userParser');

module.exports = {
    builder: new SlashCommandBuilder().setName("view")
        .setDescription("View a card's information")

        .addSubcommand(subcommand => subcommand.setName("uid")
            .setDescription("View a card in your inventory")

            .addStringOption(option => option.setName("uid")
                .setDescription("The unique ID of the card")
                .setRequired(true))
        )

        .addSubcommand(subcommand => subcommand.setName("gid")
            .setDescription("View any card")

            .addStringOption(option => option.setName("global_id")
                .setDescription("The global ID of the card")
                .setRequired(true))
        )

        .addSubcommand(subcommand => subcommand.setName("favorite")
            .setDescription("View your favorited card")
        ),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        const embedinator = new messageTools.Embedinator(interaction, {
            title: "%USER | view", author: interaction.user
        });

        // Variables to be set later depending on the operation
        let uid, globalID, card, userData, embed_view;

        // Determine the operation
        switch (interaction.options.getSubcommand()) {
            case "uid":
                // Get interation options
                uid = interaction.options.getString("uid");

                // Fetch the user from Mongo
                userData = await userManager.fetch(interaction.user.id, "full", true);

                // Get the card from the user's card_inventory
                card = userParser.cards.get(userData.card_inventory, uid);
                if (!card) return await embedinator.send(`\`${uid}\` is not a valid card ID.`);

                // Create the embed
                embed_view = userView_ES(interaction.user, userData, card, "uid");
                break;

            case "gid":
                // Get interation options
                globalID = interaction.options.getString("global_id");

                // Get the card from our global collection
                card = cardManager.get.byGlobalID(globalID);
                if (!card) return await embedinator.send(`\`${globalID}\` is not a valid global card ID.`);

                // Create the embed
                embed_view = userView_ES(interaction.user, userData, card, "global");
                break;

            case "favorite":
                // Fetch the user from Mongo
                userData = await userManager.fetch(interaction.user.id, "full", true);

                // Get the card from the user's card_inventory
                card = userParser.cards.get(userData.card_inventory, userData.card_favorite_uid);
                if (!card) return await embedinator.send("You don't have a favorite card.");

                // Create the embed
                embed_view = userView_ES(interaction.user, userData, card, "favorite");
                break;
        }

        // Send the embed
        return await interaction.editReply({ embeds: [embed_view] });
    }
};