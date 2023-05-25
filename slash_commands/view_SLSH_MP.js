const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { generalView_ES } = require('../modules/embedStyles');
const { BetterEmbed, EmbedNavigation } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');
const userParser = require('../modules/userParser');
const cardManager = require('../modules/cardManager');

module.exports = {
    builder: new SlashCommandBuilder().setName("view")
        .setDescription("View info about a card")

        .addStringOption(option => option.setName("uid")
            .setDescription("UID of a card you own")
        )

        .addStringOption(option => option.setName("gid")
            .setDescription("GID of any card")
        )

        .addStringOption(option => option.setName("setid")
            .setDescription("Set ID to view all cards in a set")
        )

        .addStringOption(option => option.setName("section")
            .setDescription("More sections to view")

            .addChoices(
                { name: "⭐ favorite", value: "favorite" },
                { name: "🏃 idol", value: "idol" },
                { name: "🔒 vault", value: "vault" },
                { name: "👯 team", value: "team" }
            )
        ),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Interaction options
        let uid = interaction.options.getString("uid");
        let globalID = interaction.options.getString("gid");
        let setID = interaction.options.getString("setid");
        let section = interaction.options.getString("section");

        // Create a base embed
        let baseEmbed = new BetterEmbed({
            interaction, author: { text: "%AUTHOR_NAME | view", user: interaction.member }
        });

        // Check if the user provided any options
        if (!uid && !globalID && !setID && !section) return await baseEmbed.send({
            description: "You need to give a card ID or section, silly!"
        });

        // Send the appropriate view based on what option the user provided
        if (uid) {
            // Fetch the user from Mongo
            let _userData = await userManager.fetch(interaction.user.id, "full");

            // Get the card from the user's card_inventory
            let _card = userParser.cards.get(_userData, uid); if (!_card) return await baseEmbed.send({
                description: "You need to give a valid UID"
            });

            // Create the embed
            let _embed_view = generalView_ES(interaction.member, _userData, _card, "uid");

            // Send the embed
            return await interaction.editReply({ embeds: [_embed_view] });
        } else if (globalID) {
            // Get the card from our global collection
            let _card = cardManager.get.byGlobalID(globalID); if (!_card) return await baseEmbed.send({
                description: "You need to give a valid GID"
            });

            // Create the embed
            let _embed_view = generalView_ES(interaction.member, null, _card, "gid");

            // Send the embed
            return await interaction.editReply({ embeds: [_embed_view] });
        } else if (setID) {
            // Get the card from our global collection
            let _cards = cardManager.get.set(setID); if (!_cards.length) return await baseEmbed.send({
                description: "You need to give a valid set ID"
            });

            // Create the embeds
            let _embed_view = generalView_ES(interaction.member, null, _cards, "set");

            // Send the embed with navigation
            let embedNav = new EmbedNavigation({ interaction, embeds: [_embed_view], paginationType: "shortJump" });
            return await embedNav.send();
        }
    }
};