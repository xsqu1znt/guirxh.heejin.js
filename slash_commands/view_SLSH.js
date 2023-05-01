const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { userView_ES, userTeamView_ES } = require('../modules/embedStyles');
const { messageTools } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');
const { dateTools } = require('../modules/jsTools');
const cardManager = require('../modules/cardManager');
const userParser = require('../modules/userParser');

module.exports = {
    builder: new SlashCommandBuilder().setName("view")
        .setDescription("View a card's information")

        .addStringOption(option => option.setName("card")
            .setDescription("Choose what you want to set")
            .addChoices(
                { name: "Unique ID", value: "uid" },
                { name: "Global ID", value: "gid" },
                { name: "Favorite", value: "favorite" },
                { name: "Idol", value: "idol" },
                { name: "Team", value: "team" },
            )
            .setRequired(true)
        )

        .addStringOption(option => option.setName("id")
            .setDescription("The unique/global ID of the card")
        ),

    /* // /VIEW UID
    .addSubcommand(subcommand => subcommand.setName("uid")
        .setDescription("View a card in your inventory")

        .addStringOption(option => option.setName("uid")
            .setDescription("The unique ID of the card")
            .setRequired(true))
    )

    // /VIEW GID
    .addSubcommand(subcommand => subcommand.setName("gid")
        .setDescription("View any card")

        .addStringOption(option => option.setName("gid")
            .setDescription("The global ID of the card")
            .setRequired(true))
    )

    // /VIEW FAVORITE
    .addSubcommand(subcommand => subcommand.setName("favorite")
        .setDescription("View your favorited card")
    )

    // /VIEW IDOL
    .addSubcommand(subcommand => subcommand.setName("idol")
        .setDescription("View the card you level up when you win /stage")
    )

    // /VIEW TEAM
    .addSubcommand(subcommand => subcommand.setName("team")
        .setDescription("View your team")
    ), */

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Interaction options and stuff
        let cardID = interaction.options.getString("id");
        let userData, card, embed_view;

        // Create a base embed
        const embedinator = new messageTools.Embedinator(interaction, {
            title: "%USER | view", author: interaction.user
        });

        // Determine the operation type
        switch (interaction.options.getString("card")) {
            case "uid":
                // Fallback
                if (!cardID) return await embedinator.send("You need to give a valid card ID.");

                // Fetch the user from Mongo
                userData = await userManager.fetch(interaction.user.id, "full", true);

                // Get the card from the user's card_inventory
                card = userParser.cards.get(userData.card_inventory, cardID);
                if (!card) return await embedinator.send(`\`${cardID}\` is not a valid card ID.`);

                // Create the embed
                embed_view = userView_ES(interaction.user, userData, card, "uid");

                break;

            case "gid":
                // Fallback
                if (!cardID) return await embedinator.send("You need to give a valid card ID.");

                // Get the card from our global collection
                card = cardManager.get.byGlobalID(cardID);
                if (!card) return await embedinator.send(`\`${cardID}\` is not a valid global card ID.`);

                // Create the embed
                embed_view = userView_ES(interaction.user, userData, card, "global");
                break;

            case "favorite":
                // Fetch the user from Mongo
                userData = await userManager.fetch(interaction.user.id, "full", true);

                // Get the card from the user's card_inventory
                card = userParser.cards.get(userData.card_inventory, userData.card_favorite_uid);
                if (!card) return await embedinator.send("You don't have a favorite card. Use **/set edit:favorite** first.");

                // Create the embed
                embed_view = userView_ES(interaction.user, userData, card, "favorite");

                break;

            case "idol":
                // Fetch the user from Mongo
                userData = await userManager.fetch(interaction.user.id, "full", true);

                // Get the card from the user's card_inventory
                card = userParser.cards.get(userData.card_inventory, userData.card_selected_uid);
                if (!card) return await embedinator.send("You don't have a card selected. Use **/set edit:idol** first.");

                // Create the embed
                embed_view = userView_ES(interaction.user, userData, card, "idol");

                break;

            case "team":
                // Fetch the user from Mongo
                userData = await userManager.fetch(interaction.user.id, "full", true);

                // Create the embeds
                embed_view = userTeamView_ES(interaction.user, userData);

                // Navigateinator-ify-er 9000!!!!11
                return await new messageTools.Navigationify(interaction, [embed_view], {
                    timeout: dateTools.parseStr(botSettings.timeout.pagination),
                    pagination: true
                }).send();
        }

        // Send the embed
        return await interaction.editReply({ embeds: [embed_view] });
    }
};