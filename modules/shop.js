const badges = require('../items/badges.json');
const itemPacks = require('../items/item_packs.json');

const { botSettings: { currencyIcon } } = require('../configs/heejinSettings.json');
const { markdown: { bold, italic, inline, link } } = require('./discordTools');
const { randomTools } = require('./jsTools');
const { userManager } = require('./mongo');
const cardManager = require('./cardManager');

//! Cards
function card_get(globalID) {
    return cardManager.cards_shop.find(card => card.globalID === globalID) || null;
}

async function card_buy(userID, globalID) {
    let card = cardManager.cards_shop.find(card => card.globalID === globalID);
    if (!card) return null;

    await Promise.all([
        // Subtract the card's price from the user's balance
        userManager.update(userID, { $inc: { balance: -card.price } }),

        // Add the card to the user's card_inventory
        userManager.cards.add(userID, card)
    ]);

    // Return the card
    return card;
}

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

    // Return the badge
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
        .replace("%PRICE", inline(currencyIcon, badge.price))

        .replace("%SET_ID", inline("🗣️", badge.setID))
        .replace("%SET", bold(badge.set))
        .replace("%RARITY", inline(`RB${badge.rarity}`))
        .replace("%CATEGORY", inline(badge.category))

        .replace("%DESCRIPTION", italic(badge.description));
}

function badge_toString_setEntry(badge, count = 1) {
    if (count < 10) count = `0${count}`;

    return "%SET_ID %BADGE_COUNT %CATEGORY %EMOJI %SET"
        .replace("%SET_ID", inline("🗣️", badge.setID))

        .replace("%BADGE_COUNT", inline("📁", count || 1))

        .replace("%CATEGORY", inline(badge.category))
        .replace("%EMOJI", badge.emoji)
        .replace("%SET", bold(badge.set));
}

//! Card Packs
function itemPack_get(id) {
    return itemPacks.find(itemPack => itemPack.id.toLowerCase() === id) || null;
}

async function itemPack_buy(userID, itemPackID) {
    let itemPack = itemPack_get(itemPackID);
    if (!itemPack) return [];

    let cards = [...new Array(itemPack.items.cards.count)].map(() => {
        // Reformat to work with randomTools.weightedChoice()
        let sets = itemPack.items.cards.fromSet.map(set => ({ id: set.id, rarity: set.chance }));

        let { id: setID } = randomTools.weightedChoice(sets);
        return randomTools.choice(cardManager.cards_all.filter(card => card.setID === setID));
    });

    // Subtract the card pack's price from the user's balance
    await userManager.update(userID, { $inc: { balance: -itemPack.price } });

    // Add the cards to the user's card_inventory
    cards = await userManager.cards.add(userID, cards, true);

    // Return the cards the user received
    return cards;
}

function itemPack_toString_shop(itemPack) {
    return "%ID %SET :: %NAME %PRICE\n> %SET_ID %RARITY %CATEGORY\n> %DESCRIPTION"
        .replace("%ID", inline(itemPack.id))
        .replace("%SET", bold(itemPack.set))
        .replace("%NAME", italic(itemPack.name))
        .replace("%PRICE", inline(currencyIcon, itemPack.price))

        .replace("%SET_ID", inline("🗣️", itemPack.setID))
        .replace("%RARITY", inline(`RB${itemPack.rarity}`))
        .replace("%CATEGORY", inline(itemPack.category))

        .replace("%DESCRIPTION", italic(itemPack.description));
}

function itemPack_toString_setEntry(itemPack, count = 1) {
    if (count < 10) count = `0${count}`;

    return "%SET_ID %ITEMPACK_COUNT %CATEGORY %EMOJI %SET"
        .replace("%SET_ID", inline("🗣️", itemPack.setID))

        .replace("%ITEMPACK_COUNT", inline("📁", count || 1))

        .replace("%CATEGORY", inline(itemPack.category))
        .replace("%EMOJI", inline(itemPack.emoji))
        .replace("%SET", bold(itemPack.set));
}

module.exports = {
    cards: {
        all: cardManager.cards_shop,
        get: card_get,
        buy: card_buy
    },

    badges: {
        all: badges,
        get: badge_get,
        buy: badge_buy,

        tobadgeLike: badge_toBadgeLike,
        frombadgeLike: badge_fromBadgeLike,

        toString: {
            basic: badge_toString_basic,
            profile: badge_toString_profile,
            shop: badge_toString_shop,
            setEntry: badge_toString_setEntry
        }
    },

    itemPacks: {
        all: itemPacks,
        get: itemPack_get,
        buy: itemPack_buy,

        toString: {
            shop: itemPack_toString_shop,
            setEntry: itemPack_toString_setEntry
        }
    }
};