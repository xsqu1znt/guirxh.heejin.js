const { emojis: { CURRENCY_1, CURRENCY_2 } } = require('../configs/config_bot.json');

const { BetterEmbed } = require('./discordTools');
const { userManager } = require('./mongo/index');
const { randomTools } = require('./jsTools');

const itemPackManager = require('./itemPackManager');
const badgeManager = require('./badgeManager');
const cardManager = require('./cardManager');
const userParser = require('./userParser');

//! Cards | CURRENCY_1
async function card_buy(guildMember, globalID) {
    let _card = cardManager.get.fromShop(globalID); if (!_card) return null;

    let userData = await userManager.fetch(guildMember.id, { type: "balance" });
    if (userData.balance < _card.price) return null;

    await Promise.all([
        // Subtract the card's price from the user's balance
        userManager.update(guildMember.id, { $inc: { balance: -_card.price } }),

        // Add the card to the user's card_inventory
        userManager.inventory.add(guildMember.id, _card)
    ]);

    // Create the embed
    let embed = new BetterEmbed({
        author: { text: "%AUTHOR_NAME | buy", user: guildMember },
        description: `You bought **\`🃏 ${_card.single} - ${_card.name}\`**:\n> ${cardManager.toString.basic(_card)}`,
        footer: { text: `balance remaining: ${CURRENCY_1.EMOJI} ${userData.balance - _card.price}` }
    });

    // Return the card and embed
    return { card: _card, embed };
}

//! Special (quest ribbons) | CURRENCY_2
async function card_buy_special(guildMember, globalID) {
    let _card = cardManager.get.fromShop(globalID, true); if (!_card) return null;

    let userData = await userManager.fetch(guildMember.id, { type: "balance" });
    if (userData.ribbons < _card.price) return null;

    await Promise.all([
        // Subtract the card's price from the user's balance
        userManager.update(guildMember.id, { $inc: { ribbons: -_card.price } }),

        // Add the card to the user's card_inventory
        userManager.inventory.add(guildMember.id, _card)
    ]);

    // Create the embed
    let embed = new BetterEmbed({
        author: { text: "%AUTHOR_NAME | buy", user: guildMember },
        description: `You bought **\`🎀 ${_card.single} - ${_card.name}\`**:\n> ${cardManager.toString.basic(_card)}`,
        footer: { text: `ribbons remaining: ${CURRENCY_2.EMOJI} ${userData.ribbons - _card.price}` }
    });

    // Return the card and embed
    return { card: _card, embed };
}

//! Card Packs | CURRENCY_1
// TODO: itemPack_buy | card packs
async function itemPack_buy(guildMember, packID) {
    let _itemPack = itemPackManager.get.packID(packID); if (!_itemPack) return [];

    let userData = await userManager.fetch(guildMember.id, { type: "balance" });
    if (userData.balance < _itemPack.price) return null;

    let _cards = [...new Array(_itemPack.content.cards.count)].map(() => {
        // Reformat to work with randomTools.weightedChoice()
        let sets = _itemPack.content.cards.sets.map(set => ({ id: set.id, rarity: set.chance }));

        let { id: setID } = randomTools.weightedChoice(sets);
        return randomTools.choice(cardManager.get.setID(setID));
    });

    await Promise.all([
        // Subtract the card pack's price from the user's balance
        userManager.update(guildMember.id, { $inc: { balance: -_itemPack.price } }),
        // Add the cards to the user's card_inventory
        userManager.inventory.add(guildMember.id, _cards)
    ]);

    /// Create the embed
    let embed = new BetterEmbed({
        author: { text: "%AUTHOR_NAME | buy", user: guildMember },
        footer: { text: `balance remaining: ${CURRENCY_1.EMOJI} ${userData.balance - _itemPack.price}` }
    });

    /// For when the item pack contains cards
    if (_cards) {
        // Fetch the user's card_inventory
        userData = await userManager.fetch(guildMember.id, { type: "inventory" })

        // Check which cards the user already has
        let _cards_isDuplicate = _cards.map(card =>
            userParser.cards.getDuplicates(userData, card.globalID).duplicateCount >= 1
        );

        // Format _cards into strings
        let _cards_f = _cards.map((card, idx) =>
            `> ${cardManager.toString.inventory(card, { simplify: true, isDuplicate: _cards_isDuplicate[idx] })}`
        );

        // Set the embed's description
        embed.setDescription(`You bought **\`📦 ${_itemPack.name}\`** and got:\n${_cards_f.join("\n")}`);

        // Set the embed's image to be the last card in the array
        embed.setImage(_cards.slice(-1)[0]?.imageURL);
    }

    // Return the item pack content and the embed
    return { content: { cards: _cards }, embed };
}

//! Badges | CURRENCY_1
async function badge_buy(guildMember, badgeID) {
    let _badge = badgeManager.get.badgeID(badgeID); if (!_badge) return null;

    let userData = await userManager.fetch(guildMember.id, { type: "balance" });
    if (userData.balance < _badge.price) return null;

    await Promise.all([
        // Subtract the badge's price from the user's balance
        userManager.update(guildMember.id, { $inc: { balance: -_badge.price } }),

        // Add the badge to the user's profile
        userManager.badges.add(guildMember.id, _badge)
    ]);

    // Create the embed
    let embed = new BetterEmbed({
        author: { text: "%AUTHOR_NAME | buy", user: guildMember },
        description: `You bought **\`📛 ${_badge.name}\`**:\n> ${badgeManager.toString.basic(_badge)}`,
        footer: { text: `balance remaining: ${CURRENCY_1.EMOJI} ${userData.balance - _badge.price}` }
    });

    // Return the badge and embed
    return { badge: _badge, embed };
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