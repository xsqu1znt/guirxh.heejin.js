const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { emojis: { CURRENCY_1, CURRENCY_2 } } = require('../configs/config_bot.json');

// const { arrayTools } = require('../modules/jsTools');
const { generalError_ES, generalShop_ES } = require('../modules/embedStyles');
const { BetterEmbed, EmbedNavigator } = require('../modules/discordTools');

const { userManager } = require('../modules/mongo/index');

// const cardManager = require('../modules/cardManager');
// const userParser = require('../modules/userParser');
const shop = require('../modules/shop');

module.exports = {
    options: { icon: "🛍️", deferReply: false },

    builder: new SlashCommandBuilder().setName("shop")
        .setDescription("View the shop")

        .addStringOption(option => option.setName("buy")
            .setDescription("Buy something using the item's ID")),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let itemID = interaction.options.getString("buy"); itemID &&= itemID.toLowerCase().trim();

        // Check if an item ID was provided
        if (!itemID) {
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

        /// Try to buy the item from the shop using the provided item ID
        await interaction.deferReply();

        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id, { type: "essential" });

        // Determine what item the user picked
        switch ((shop.getItem(itemID)).type) {
            case "card_general":
                let _card_general = await shop.cards.buy(interaction.user.id, itemID);
                if (!_card_general) return await generalError_ES(interaction, "purchaseFailed",
                    `You do not have enough \`${CURRENCY_1.EMOJI}\` to buy this item`
                );

                break;

            case "card_special":
                let _card_special = await shop.cards.buy_special(interaction.user.id, itemID);
                if (!_card_special) return await generalError_ES(interaction, "purchaseFailed",
                    `You do not have enough \`${CURRENCY_2.EMOJI}\` to buy this item`
                );

                break;

            case "item_pack":
                let _itemPack = await shop.itemPacks.buy(interaction.user.id, itemID);
                if (!_itemPack) return await generalError_ES(interaction, "purchaseFailed",
                    `You do not have enough \`${CURRENCY_1.EMOJI}\` to buy this item`
                );

                break;

            case "badge":
                let _badge = await shop.badges.buy(interaction.user.id, itemID);
                if (!_badge) return await generalError_ES(interaction, "purchaseFailed",
                    `You do not have enough \`${CURRENCY_1.EMOJI}\` to buy this item`
                );

                break;

            default: return await embed_error_InF.send({ description: `\`${itemID}\` is not an item in the shop` });
        }
    }
};