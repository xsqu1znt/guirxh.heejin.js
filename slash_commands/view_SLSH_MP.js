const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { generalView_ES } = require('../modules/embedStyles');
const { BetterEmbed, EmbedNavigator } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');
const userParser = require('../modules/userParser');
const cardManager = require('../modules/cardManager');

module.exports = {
    options: { icon: "👀", deferReply: true },

    builder: new SlashCommandBuilder().setName("view")
        .setDescription("View information about a card")

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
            let _embeds_view = generalView_ES(interaction.member, null, _cards, "set");

            // Send the embeds with navigation
            let _embedNav = new EmbedNavigator({
                interaction, embeds: [_embeds_view], useReactionsForPagination: true,
                paginationType: "short", dynamicPagination: false
            });
            return await _embedNav.send();
        } else if (section) {
            // Fetch the user from Mongo
            let _userData = await userManager.fetch(interaction.user.id, "full");

            switch (section) {
                case "idol":
                    // Get the card from the user's card_inventory
                    let _card_idol = userParser.cards.get(_userData, _userData.card_selected_uid);
                    if (!_card_idol) return await baseEmbed.send({
                        description: "You don't have an idol!\n> Use \`/set\` \`edit:🏃 idol\` to change"
                    });

                    // Create the embed
                    let _embed_idol = generalView_ES(interaction.member, _userData, _card_idol, "idol");

                    // Send the embed
                    return await interaction.editReply({ embeds: [_embed_idol] });

                case "favorite":
                    // Get the card from the user's card_inventory
                    let _card_favorite = userParser.cards.get(_userData, _userData.card_favorite_uid);
                    if (!_card_favorite) return await baseEmbed.send({
                        description: "You don't have a favorite!\n> Use \`/set\` \`edit:⭐ favorite\` to change"
                    });

                    // Create the embed
                    let _embed_favorite = generalView_ES(interaction.member, _userData, _card_favorite, "favorite");

                    // Send the embed
                    return await interaction.editReply({ embeds: [_embed_favorite] });

                case "vault":
                    // Get the user's vault from their card_inventory
                    let _cards_vault = userParser.cards.getVault(_userData); if (!_cards_vault.length) return await baseEmbed.send({
                        description: "You don't have anything in your vault!\n> Use \`/set\` \`edit:🔒 vault\` to change"
                    });

                    // Create the embeds
                    let _embeds_vault = generalView_ES(interaction.member, _userData, _cards_vault, "vault");

                    // Send the embeds with navigation
                    let _embedNav_vault = new EmbedNavigator({
                        interaction, embeds: [_embeds_vault], useReactionsForPagination: true,
                        paginationType: "short", dynamicPagination: false
                    });
                    return await _embedNav_vault.send();

                case "team":
                    // Get the user's vault from their card_inventory
                    let _cards_team = userParser.cards.getTeam(_userData).cards;
                    if (!_cards_team.length) return await baseEmbed.send({
                        description: "You don't have a team!\n> Use \`/set\` \`edit:👯 team\` to change"
                    });

                    // Create the embeds
                    let _embeds_team = generalView_ES(interaction.member, _userData, _cards_team, "team");

                    // Send the embeds with navigation
                    let _embedNav_team = new EmbedNavigator({
                        interaction, embeds: [_embeds_team], useReactionsForPagination: true,
                        paginationType: "short", dynamicPagination: false
                    });
                    return await _embedNav_team.send();
            }
        } else return await baseEmbed.send({
            description: "You need to give a card ID or section, silly!"
        });
    }
};