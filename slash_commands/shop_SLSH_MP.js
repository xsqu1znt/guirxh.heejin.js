const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { arrayTools } = require('../modules/jsTools');
const { generalShop_ES } = require('../modules/embedStyles');
const { BetterEmbed, EmbedNavigator } = require('../modules/discordTools');

const { userManager } = require('../modules/mongo/index');

const cardManager = require('../modules/cardManager');
const userParser = require('../modules/userParser');
const shop = require('../modules/shop');

module.exports = {
    options: { icon: "🛍️", deferReply: false },

    builder: new SlashCommandBuilder().setName("shop")
        .setDescription("View the shop"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Create the shop pages
        let embed_shop = generalShop_ES(interaction.member);

        // Create the embed navigation
        let embed_withNav = new EmbedNavigator({
            interaction, embeds: embed_shop.embeds_all, useReactionsForPagination: false,
            paginationType: "shortJump", dynamicPagination: false, selectMenu: true
        });

        /// Add select menu options
        if (embed_shop.embeds?.shopSets)
            embed_withNav.addToSelectMenu({
                emoji: "🛍️", label: "Shop Sets", description: "View a list of every set available", isDefault: true
            });

        if (embed_shop.embeds?.allCards?.length)
            embed_withNav.addToSelectMenu({ emoji: "📁", label: "All Cards", description: "View all cards available" });

        if (embed_shop.embeds?.individualCardSets?.length) embed_shop.cardSets.forEach(set =>
            embed_withNav.addToSelectMenu({ emoji: set.emoji, label: set.name, description: `View ${set.description}` })
        );

        if (embed_shop.embeds?.allCards_special?.length)
            embed_withNav.addToSelectMenu({ emoji: "🎀", label: "Rewards", description: "Buy a special card" });

        if (embed_shop.embeds?.itemPacks?.length)
            embed_withNav.addToSelectMenu({ emoji: "✨", label: "Item Packs", description: "Buy a boost/card pack" });

        if (embed_shop?.embeds.badges?.length)
            embed_withNav.addToSelectMenu({ emoji: "📛", label: "Badges", description: "Buy a badge for your profile" });

        // Send the embeds with navigation
        return await embed_withNav.send();
    }
};