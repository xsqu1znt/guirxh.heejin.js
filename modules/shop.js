const { emojis: { CURRENCY_1, CURRENCY_2 } } = require('../configs/config_bot.json');

const { userManager } = require('./mongo/index');
const { randomTools } = require('./jsTools');

const itemPackManager = require('./itemPackManager');
const badgeManager = require('./badgeManager');
const cardManager = require('./cardManager');

//! Cards | CURRENCY_1
async function card_buy(userID, globalID) {
    let card = cardManager.get.fromShop(globalID); if (!card) return null;

    let userData = await userManager.fetch(userID, { type: "balance" });
    if (userData.balance < card.price) return null;

    await Promise.all([
        // Subtract the card's price from the user's balance
        userManager.update(userID, { $inc: { balance: -card.price } }),

        // Add the card to the user's card_inventory
        userManager.inventory.add(userID, card)
    ]);

    // Return the card
    return card;
}

//! Special (quest ribbons) | CURRENCY_2
async function card_buy_special(userID, globalID) {
    let card = cardManager.get.fromShop(globalID, true); if (!card) return null;

    let userData = await userManager.fetch(userID, { type: "balance" });
    if (userData.ribbons < card.price) return null;

    await Promise.all([
        // Subtract the card's price from the user's balance
        userManager.update(userID, { $inc: { ribbons: -card.price } }),

        // Add the card to the user's card_inventory
        userManager.inventory.add(userID, card)
    ]);

    // Return the card
    return card;
}

//! Card Packs | CURRENCY_1
// TODO: itemPack_buy | card packs
async function itemPack_buy(userID, packID) {
    let itemPack = itemPackManager.get.packID(packID); if (!itemPack) return [];

    let userData = await userManager.fetch(userID, { type: "balance" });
    if (userData.balance < itemPack.price) return null;

    let cards = [...new Array(itemPack.items.cards.count)].map(() => {
        // Reformat to work with randomTools.weightedChoice()
        let sets = itemPack.items.cards.fromSet.map(set => ({ id: set.id, rarity: set.chance }));

        let { id: setID } = randomTools.weightedChoice(sets);
        return randomTools.choice(cardManager.cards_all.filter(card => card.setID === setID));
    });

    await Promise.all([
        // Subtract the card pack's price from the user's balance
        userManager.update(userID, { $inc: { balance: -itemPack.price } }),
        // Add the cards to the user's card_inventory
        userManager.cards.add(userID, cards)
    ]);

    // Return the cards the user received
    return cards;
}

//! Badges | CURRENCY_1
async function badge_buy(userID, badgeID) {
    let badge = badge_get(badgeID); if (!badge) return null;

    let userData = await userManager.fetch(userID, { type: "balance" });
    if (userData.balance < badge.price) return null;

    await Promise.all([
        // Subtract the badge's price from the user's balance
        userManager.update(userID, { $inc: { balance: -badge.price } }),

        // Add the badge to the user's profile
        userManager.badges.add(userID, badge)
    ]);

    // Return the badge
    return badge;
}

//! General
function getItem(itemID) {
    let possibleItems = {
        card_general: cardManager.get.fromShop(itemID),
        card_special: cardManager.get.fromShop(itemID, true),

        item_pack: itemPackManager.get.packID(itemID),
        badge: badgeManager.get.badgeID(itemID)
    };

    let item = Object.entries(possibleItems).filter(item => item[1])[0];

    return { item: item ? item[1] : null, type: item ? item[0] : null };
}

module.exports = {
    getItem,

    cards: {
        all: cardManager.cards_shop,
        get: cardManager.get.fromShop,
        buy: card_buy, buy_special: card_buy_special
    },

    badges: {
        all: badgeManager.badges,
        get: badgeManager.get.badgeID,
        buy: badge_buy
    },

    itemPacks: {
        all: itemPackManager.itemPacks,
        get: itemPackManager.get.packID,
        buy: itemPack_buy,
    }
};