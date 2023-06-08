const { User } = require('discord.js');
const { botSettings: { currencyIcon } } = require('../configs/heejinSettings.json');
const { BetterEmbed } = require("./discordTools");
const cardManager = require("./cardManager");
const logger = require('./logger');

const embed_titles = {
    gift: "\`📬\` You have a message!"
}

/** @param {User} recipient @param {Array<string>} cards_f */
async function gift_cards(recipient, cards, cards_f = null) {
    if (!Array.isArray(cards)) cards = [cards];

    // Get the last card in the array
    let cards_last = cards.slice(-1)[0] || cards[0];

    // Parse each card into a string if card_f wasn't provided
    cards_f ||= cards.map(card => cardManager.toString.basic(card));

    // Create the embed
    let embed_giftCards = new BetterEmbed({
        title: { text: embed_titles.gift },
        description: `You got a gift from **${recipient.username}**\n>>> ${cards_f.join("\n")}`,
        imageURL: cards_last.imageURL,
        showTimestamp: true
    });

    // Send the embed to the user
    try {
        return await recipient.send({ embeds: [embed_giftCards] });
    } catch (err) {
        logger.error("Failed to DM user", `userID: ${recipient?.userID || "N/A"}`);
    }
}

/** @param {User} recipient @param {number} amount */
async function gift_currency(recipient, amount, currentBalance) {
    // Create the embed
    let embed_giftCurrency = new BetterEmbed({
        title: { text: embed_titles.gift },
        description: `You got \`${currencyIcon} ${amount}\` from **${recipient.username}**\n> Balance currently: \`${currencyIcon} ${currentBalance}\``,
        showTimestamp: true
    });

    // Send the embed to the user
    try {
        return await recipient.send({ embeds: [embed_giftCurrency] });
    } catch (err) {
        logger.error("Failed to DM user", `userID: ${recipient?.userID || "N/A"}`, err);
    }
}

module.exports = {
    gift: {
        cards: gift_cards,
        currency: gift_currency
    }
}