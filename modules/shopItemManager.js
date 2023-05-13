const badges = require('../items/badges.json');
const cardPacks = require('../items/card_packs.json');

const { botSettings: { currencyIcon } } = require('../configs/heejinSettings.json');
const cardManager = require('./cardManager');
const { randomTools } = require('./jsTools');
const { userManager } = require('./mongo');

const bold = (...str) => `**${str.join(" ")}**`;
const italic = (...str) => `*${str.join(" ")}*`;
const inline = (...str) => `\`${str.join(" ")}\``;
const quote = (...str) => `> ${str.join(" ")}`;
const link = (label, url, tooltip = "") => `[${label}](${url}${tooltip ? ` "${tooltip}"` : ""})`;

//! Badges
function badge_get(id) {
    return badges.find(badge => badge.id.toLowerCase() === id) || null;
}

function badge_toBadgeLike(badge) {
    return { id: badge.id, setID: badge.setID };
}

function badge_fromBadgeLike(badgeLike) {
    return { ...badge_get(badgeLike.id.toLowerCase()), ...badgeLike };
}

async function badge_buy(userID, badgeID) {
    let badge = badge_get(badgeID);
    if (!badge) return null;

    await Promise.all([
        // Subtract the badge's price from the user's balance
        userManager.update(userID, { $inc: { balance: -badge.price } }),

        // Add the badge to the user's profile
        userManager.badges.add(userID, badge)
    ]);

    return badge;
}

function badge_toString_basic(badge) {
    return "%EMOJI %SET :: %NAME"
        .replace("%EMOJI", badge.emoji)
        .replace("%SET", bold(badge.set))
        .replace("%NAME", italic(link(badge.name, badge.emojiURL, badge.description)));
}

function badge_toString_profile(badge) {
    return inline("%EMOJI %SET %NAME")
        .replace("%EMOJI", badge.emoji)
        .replace("%SET", badge.set)
        .replace("%NAME", badge.name);
}

function badge_toString_shop(badge) {
    return "%ID %EMOJI %SET :: %NAME %PRICE\n> %SET_ID %RARITY %CATEGORY\n> %DESCRIPTION"
        .replace("%ID", inline(badge.id))
        .replace("%EMOJI", badge.emoji)
        .replace("%NAME", italic(link(badge.name, badge.emojiURL, badge.description)))
        .replace("%PRICE", inline(true, botSettings.currencyIcon, badge.price))

        .replace("%SET_ID", inline("🗣️", badge.setID))
        .replace("%SET", bold(badge.set))
        .replace("%RARITY", inline(`RB${badge.rarity}`))
        .replace("%CATEGORY", inline(badge.category))

        .replace("%DESCRIPTION", italic(badge.description));
}

//! Card Packs
function cardPack_get(id) {
    return cardPacks.find(cardPack => cardPack.id.toLowerCase() === id) || null;
}

async function cardPack_buy(userID, cardPackID) {
    let cardPack = cardPack_get(cardPackID);
    if (!cardPack) return [];

    let cards = cardPack.cardSetIDs.map(setID =>
        randomTools.choice(cardManager.cards_all.filter(card => card.setID === setID))
    );

    await Promise.all([
        // Subtract the card pack's price from the user's balance
        userManager.update(userID, { $inc: { balance: -cardPack.price } }),

        // Add the cards to the user's card_inventory
        userManager.cards.add(userID, cards, true)
    ]);

    // Return the cards the user received
    return cards;
}

function cardPack_toString_shop(cardPack) {
    return "%ID %EMOJI %SET :: %NAME %PRICE\n> %SET_ID %RARITY %CATEGORY\n> %DESCRIPTION"
        .replace("%ID", inline(cardPack.id))
        .replace("%EMOJI", cardPack.emoji)
        .replace("%NAME", italic(cardPack.name))
        .replace("%PRICE", inline(true, currencyIcon, cardPack.price))

        .replace("%SET_ID", inline("🗣️", cardPack.setID))
        .replace("%SET", bold(cardPack.set))
        .replace("%RARITY", inline(`RB${cardPack.rarity}`))
        .replace("%CATEGORY", inline(cardPack.category))

        .replace("%DESCRIPTION", italic(cardPack.description));
}

module.exports = {
    badges, cardPacks,

    badgeManager: {
        get: badge_get,
        buy: badge_buy,

        tobadgeLike: badge_toBadgeLike,
        frombadgeLike: badge_fromBadgeLike,

        toString: {
            basic: badge_toString_basic,
            profile: badge_toString_profile,
            shop: badge_toString_shop
        }
    },

    cardPackManager: {
        get: cardPack_get,
        buy: cardPack_buy,

        toString: {
            shop: cardPack_toString_shop
        }
    }
}