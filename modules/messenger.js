const { User } = require('discord.js');
const { botSettings: { currencyIcon } } = require('../configs/heejinSettings.json');
const { BetterEmbed } = require("./discordTools");
const cardManager = require("./cardManager");
const logger = require('./logger');

const embed_titles = {
    gift: "📬 You have a message!"
}

/** @param {User} recipient @param {User} gifter @param {Array<string>} cards_f */
async function gift_cards(recipient, gifter, cards, cards_f = null) {
    if (!Array.isArray(cards)) cards = [cards];

    // Get the last card in the array
    let cards_last = cards.slice(-1)[0] || cards[0];

    // Parse each card into a string if card_f wasn't provided
    cards_f ||= cards.map(card => cardManager.toString.basic(card));

    // Create the embed
    let embed_giftCards = new BetterEmbed({
        author: { text: embed_titles.gift },
        description: `You got a gift from **${gifter.username}**\n>>> ${cards_f.join("\n")}`,
        imageURL: cards_last.imageURL,
        showTimestamp: true
    });

    // Send the embed to the user
    try {
        return await recipient.send({ embeds: [embed_giftCards] });
    } catch (err) {
        logger.error("Failed to DM user", `userID: ${recipient?.userID || "N/A"} | TYPE: gift_card`);
    }
}

/** @param {User} recipient @param {User} gifter @param {number} amount  @param {number} currentBalance */
async function gift_currency(recipient, gifter, amount, currentBalance) {
    // Create the embed
    let embed_giftCurrency = new BetterEmbed({
        author: { text: embed_titles.gift },
        description: `You got \`${currencyIcon} ${amount}\` from **${gifter.username}**\n> Balance currently: \`${currencyIcon} ${currentBalance}\``,
        showTimestamp: true
    });

    // Send the embed to the user
    try {
        return await recipient.send({ embeds: [embed_giftCurrency] });
    } catch (err) {
        logger.error("Failed to DM user", `userID: ${recipient?.userID || "N/A"} | TYPE: gift_currency`, err);
    }
}

/** @param {User} recipient @param {{}} quest */
async function quest_complete(recipient, quest, rewards) {
    /// Format rewards into a string
    // General
    let rewards_general_f = "";
    if (quest.rewards?.carrots) rewards_general_f += `\`🥕 ${quest.rewards.carrots}\``;
    if (quest.rewards?.ribbons) rewards_general_f += `\n\`🎀 ${quest.rewards.ribbons}\``;

    // Cards
    let rewards_cards_f = quest.rewards?.card_global_ids
        ? `\`🃏 ${quest.rewards.card_global_ids.length}\` ${quest.card_global_ids.map(card => carddManager.toString.basic(card))}`
        : "";

    // Create the embed
    let embed_questComplete = new BetterEmbed({
        author: { text: `📜 Good job! You completed \'${quest.name}\'`, user: recipient, iconURL: null },
        description: `You got:\n> ${rewards_general_f}\n\n${rewards_cards_f}`,
        showTimestamp: true
    });

    // Send the embed to the user
    try {
        return await recipient.send({ embeds: [embed_questComplete] });
    } catch (err) {
        logger.error("Failed to DM user", `userID: ${recipient?.userID || "N/A"} | TYPE: quest_complete`, err);
    }
}

module.exports = {
    gift: {
        cards: gift_cards,
        currency: gift_currency
    },

    quest: {
        complete: quest_complete
    }
}