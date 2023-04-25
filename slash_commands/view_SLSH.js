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
                .setDescription("The unique ID of the card"))
        )

        .addSubcommand(subcommand => subcommand.setName("gid")
            .setDescription("View any card")

            .addStringOption(option => option.setName("global_id")
                .setDescription("The global ID of the card"))
        )

        .addSubcommand(subcommand => subcommand.setName("set")
            .setDescription("View a list of every card in a set")

            .addStringOption(option => option.setName("set_id")
                .setDescription("The set's ID"))
        )

        .addSubcommand(subcommand => subcommand.setName("favorite")
            .setDescription("View your favorited card")
        )

        .addSubcommand(subcommand => subcommand.setName("idol")
            .setDescription("View your favorited card")
        )

        /* .addStringOption(option => option.setName("uid")
            .setDescription("The unique ID to view a card in your inventory"))

        .addStringOption(option => option.setName("global_id")
            .setDescription("The global ID to view a card globally")) */,

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        /* // Reusable embedinator to send success/error messages
        const embedinator = new messageTools.Embedinator(interaction, {
            title: "%USER | view", author: interaction.user
        });

        // Get interation options
        let uid = interaction.options.getString("uid");
        let globalID = interaction.options.getString("global_id");

        // In case the user didn't provide an ID
        if (!uid && !globalID) return await embedinator.send("You must provide a unique/global ID.");

        let card = null;
        let embed_view = null;
        let userData = null;
        // View a card in the user's inventory
        if (uid) {
            // Fetch the user from Mongo
            userData = await userManager.fetch(interaction.user.id, "full", true);

            // Get the card from the user's card_inventory
            card = userParser.cards.get(userData.card_inventory, uid);
            if (!card) return await embedinator.send(`\`${uid}\` is not a valid card ID.`);

            // Create the embed
            embed_view = userView_ES(interaction.user, userData, card);
        }

        // View a card globally
        else if (globalID) {
            // Get the card from our global collection
            card = cardManager.get.byGlobalID(globalID);
            if (!card) return await embedinator.send(`\`${globalID}\` is not a valid global card ID.`);

            // Create the embed
            embed_view = userView_ES(interaction.user, userData, card, false, true);
        }

        // Send the embed
        return await interaction.editReply({ embeds: [embed_view] }); */
    }
};