const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { arrayTools, dateTools } = require('../modules/jsTools');
const { globalShop_ES } = require('../modules/embedStyles');
const { messageTools } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');
const badgeManager = require('../modules/badgeManager');
const cardManager = require('../modules/cardManager');

module.exports = {
    builder: new SlashCommandBuilder().setName("shop")
        .setDescription("View the shop")

        .addStringOption(option => option.setName("buy")
            .setDescription("Buy an item from the shop using its ID")),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Create a base embed
        const embedinator = new messageTools.Embedinator(interaction, {
            title: "%USER | shop", author: interaction.user
        });

        //* Try buying the item if the user gave an ID
        let buyID = interaction.options.getString("buy");
        if (buyID) {
            let userData = await userManager.fetch(interaction.user.id, "essential", true);
            let _card = cardManager.get.byGlobalID(buyID);
            let _badge = badgeManager.get(buyID);

            let buyResult = `\`${buyID}\` is not a valid ID.`;

            // Determine the operation type
            if (_card) { // The user buys a card
                if (userData.balance < _card.price) return await embedinator.send(
                    "You don't have enough to buy that card."
                );

                // Add the card to the user's card_inventory
                await userManager.cards.add(interaction.user.id, _card, true);

                // Subtract the card's price from the user's balance
                await userManager.update(interaction.user.id, { balance: userData.balance - _card.price });

                let _card_f = cardManager.toString.basic(_card);
                buyResult = `You bought a card:\n${_card_f}`;
            } else if (_badge) { // The user buys a badge
                if (userData.balance < _badge.price) return await embedinator.send(
                    "You don't have enough to buy that badge."
                );

                // Add the badge to the user
                await userManager.badges.add(interaction.user.id, _badge);

                // Subtract the badge's price from the user's balance
                await userManager.update(interaction.user.id, { balance: userData.balance - _badge.price });

                let _badge_f = badgeManager.toString(_badge);
                buyResult = `You bought a badge:\n${_badge_f}`;
            }

            // Let the user know the result
            return await embedinator.send(buyResult);
        }

        //* Display the shop if the user didn't give an ID
        // Build the shop pages
        let embed_shop = globalShop_ES(interaction.user);

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
            label: "List",
            description: "View a list of each available set.",
            isDefault: true
        });

        navigationify.addSelectMenuOption({ emoji: "📁", label: "All Cards", description: "View all the available shop cards." });

        // Add a select menu option for each card group
        shopCards_unique.forEach(card => navigationify.addSelectMenuOption({ emoji: card.emoji, label: card.group }));

        // navigationify.addSelectMenuOption({ label: "Card Packs", description: "Buy a pack of random cards." });
        navigationify.addSelectMenuOption({ emoji: "📛", label: "Badges", description: "Buy a badge for your profile." });

        // Send the shop embed
        return await navigationify.send();
    }
};