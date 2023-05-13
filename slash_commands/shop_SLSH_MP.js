const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { arrayTools, dateTools } = require('../modules/jsTools');
const { generalShop_ES } = require('../modules/embedStyles');
const { messageTools } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');
// const badgeManager = require('../modules/badgeManager');
const cardManager = require('../modules/cardManager');
const shop = require('../modules/shop');

module.exports = {
    builder: new SlashCommandBuilder().setName("shop")
        .setDescription("View the shop")

        .addStringOption(option => option.setName("buy")
            .setDescription("Buy anything using their ID")),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let embed_shop = new messageTools.Embedinator(interaction, {
            title: "%USER | shop", author: interaction.user
        });

        //* Try buying the item if the user gave an ID
        let buyID = interaction.options.getString("buy"); buyID &&= buyID.toLowerCase();
        if (buyID) {
            // Fetch the user from Mongo
            let userData = await userManager.fetch(interaction.user.id, "essential", true);

            let _card = shop.cards.get(buyID); if (_card) {
                if (userData.balance < _badge.price) return await embed_shop.send(
                    "You do not have enough to buy that card"
                );

                // Buy the card and add it to the user's card_inventory
                await shop.cards.buy(interaction.user.id, buyID);

                // Let the user know the result
                let _card_f = cardManager.toString.basic(_card);
                return await embed_shop.send(`You bought a card:\n${_card_f}`);
            }

            let _badge = shop.badges.get(buyID); if (_badge) {
                if (userData.balance < _badge.price) return await embed_shop.send(
                    "You do not have enough to buy that badge"
                );

                // Check if the user already has that badge
                if (userData.badges.find(badge => badge.id === _badge.id)) return await embed_shop.send(
                    "You already have that badge"
                );

                // Buy the badge and add it to the user's profile
                await shop.badges.buy(interaction.user.id, buyID);

                // Let the user know the result
                let _badge_f = shop.badges.toString.basic(_badge);
                return await embed_shop.send(`You bought a badge:\n> ${_badge_f}`);
            }

            let _cardPack = shop.cardPacks.get(buyID); if (_cardPack) {
                if (userData.balance < _cardPack.price) return await embed_shop.send(
                    "You do not have enough to buy that card pack"
                );

                // Buy the card pack and add it to the user's card_inventory
                let _receivedCards = await shop.cardPacks.buy(interaction.user.id, buyID);

                // Let the user know the result
                let _receivedCards_f = _receivedCards.map(card => cardManager.toString.basic(card));
                return await embed_shop.send(`You bought a card pack and received:\n${_receivedCards_f.join("\n")}`);
            }

            // Let the user know they gave an invalid ID
            return await embed_shop.send(`\`${buyID}\` is not a valid ID`);
        }

        //* Display the shop if the user didn't give an ID
        // Build the shop pages
        embed_shop = generalShop_ES(interaction.user);

        // Navigateinator-ify-er 9000!!!!11
        let navigationify = new messageTools.Navigationify(interaction, embed_shop, {
            timeout: dateTools.parseStr(botSettings.timeout.pagination),
            pagination: true,
            selectMenu: true
        });

        // Get an array of unique cards based on the set ID
        let shopCards_unique = arrayTools.unique(cardManager.cards_shop,
            (card, compareCard) => card.setID === compareCard.setID
        );

        // ! Select menu options
        navigationify.addSelectMenuOption({
            emoji: "🛍️",
            label: "Shop Sets",
            description: "View a list of every set available",
            isDefault: true
        });

        navigationify.addSelectMenuOption({ emoji: "📁", label: "All Cards", description: "View all cards available" });

        // Add a select menu option for each card group
        shopCards_unique.forEach(card => navigationify.addSelectMenuOption({ emoji: card.emoji, label: card.group, description: `View ${card.description}` }));

        navigationify.addSelectMenuOption({ emoji: "🃏", label: "Card Packs", description: "Buy a pack of random cards" });
        navigationify.addSelectMenuOption({ emoji: "📛", label: "Badges", description: "Buy a badge for your profile" });

        // Send the shop embed
        return await navigationify.send();
    }
};