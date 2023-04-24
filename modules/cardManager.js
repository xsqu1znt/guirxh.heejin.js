const { inlineCode, bold, italic } = require('discord.js');

const { dropSettings } = require('../configs/heejinSettings.json');
const { randomTools } = require('./jsTools');

const cards = {
    common: require('../cards/cards_common.json'),
    uncommon: require('../cards/cards_uncommon.json'),
    rare: require('../cards/cards_rare.json'),
    epic: require('../cards/cards_epic.json'),
    mint: require('../cards/cards_mint.json'),

    weekly: [],
    seasonal: [],
    event: [],
};

let cards_all = []; Object.keys(cards).forEach(key => cards_all = [...cards_all, ...cards[key]]);

//! General
function resetUID(card, userCards = null) {
    let newUID = () => randomTools.numberString(6);

    if (userCards) {
        let uid = card?.uid || newUID();

        // Loop this function until we have a unique UID
        if (userCards.find(card => card.uid === uid))
            return this.resetUID(card, userCards);

        card.uid = uid;
    } else card.uid = newUID();

    // Return the card
    return card;
}

//! Fetch
function fetch_byGlobalID(globalID) {
    let card = cards_all.find(card => card.globalID === globalID);
    return card || null;
}

/**
 * @param {"drop_5" | "weekly" | "seasonal" | "event"} dropCategory 
 */
function fetch_randomDrop(dropCategory) {
    let cards_drop = [...cards.common, ...cards.uncommon, ...cards.rare, ...cards.epic, ...cards.mint];
    let card_choices = [];

    switch (dropCategory) {
        case 'drop_5':
            let categories = Object.values(dropSettings.chances).map(c => ({ ...c, rarity: c.chance }));
            let category_picked = randomTools.weightedChoice(categories);

            card_choices = cards_drop.filter(card => card.rarity === category_picked.cardRarityFilter);
            break;
        case 'weekly':
            card_choices = cards.weekly;
            break;
        case 'seasonal':
            card_choices = cards.seasonal;
            break;
        case 'event':
            card_choices = cards.event;
            break;
    }

    // Return a random card from the list
    return randomTools.choice(card_choices) || null;
}

//! Parse
function parse_toCardLike(card) {
    return {
        uid: card.uid,
        globalID: card.globalID,
        setID: card.setID,
        stats: card.stats
    };
}

function parse_fromCardLike(cardLike) {
    return { ...fetch_byGlobalID(cardLike.globalID), ...cardLike };
}

//! To String
function toString_basic(card) {
    return "%EMOJI %UID :: %SINGLE - %NAME"
        .replace("%EMOJI", inlineCode(card.emoji))
        .replace("%UID", inlineCode(card.uid))
        .replace("%SINGLE", bold(card.single))
        .replace("%NAME", card.name);
}

function toString_inventory(card, duplicateCount = 0, isFavorite = false) {
    return "%EMOJI %GROUP - %SINGLE : %NAME :: LV. %LEVEL %DUPES\n> %UID %GLOBAL_ID %CATEGORY %SET_ID%LOCKED%FAVORITED\n> %ABILITY :: %REPUTATION"
        .replace("%EMOJI", inlineCode(card.emoji))
        .replace("%GROUP", bold(card.group))
        .replace("%SINGLE", card.single)
        .replace("%NAME", card.name)
        .replace("%LEVEL", card.stats.level)
        .replace("%DUPES", duplicateCount > 0 ? inlineCode(`${duplicateCount} ${duplicateCount > 1 ? "Dupes" : "Dupe"}`) : "")

        .replace("%UID", inlineCode(card.uid))
        .replace("%GLOBAL_ID", inlineCode(card.globalID))
        .replace("%CATEGORY", inlineCode(card.category))
        .replace("%SET_ID", inlineCode(`👥${card.setID}`))

        .replace("%LOCKED", card?.locked ? " " + inlineCode("🔒") : "")
        .replace("%FAVORITED", isFavorite ? " " + inlineCode("🌟") : "")

        .replace("%ABILITY", inlineCode(`🎤 ABI. ${card.stats.ability}`))
        .replace("%REPUTATION", inlineCode(`💖 REP. ${card.stats.reputation}`));
}

function toString_drop(card, isDuplicate = false) {
    return "%EMOJI %GROUP - %SINGLE : %NAME%IS_DUPE\n> %UID %GLOBAL_ID %CATEGORY %SET_ID\n> %ABILITY :: %REPUTATION"
        .replace("%EMOJI", inlineCode(card.emoji))
        .replace("%GROUP", bold(card.group))
        .replace("%SINGLE", card.single)
        .replace("%NAME", card.name)
        .replace("%IS_DUPE", isDuplicate ? bold(italic("⁻⁻ ᴰ ᵁ ᴾ ᴱ")) : "")
        .replace("%UID", inlineCode(card.uid))
        .replace("%GLOBAL_ID", inlineCode(card.globalID))
        .replace("%CATEGORY", inlineCode(card.category))
        .replace("%SET_ID", inlineCode(`👥${card.setID}`))
        .replace("%ABILITY", inlineCode(`🎤 ABI. ${card.stats.ability}`))
        .replace("%REPUTATION", inlineCode(`💖 REP. ${card.stats.reputation}`));
}

module.exports = {
    resetUID,

    fetch: {
        drop: fetch_randomDrop
    },

    parse: {
        toCardLike: parse_toCardLike,
        fromCardLike: parse_fromCardLike
    },

    toString: {
        basic: toString_basic,
        drop: toString_drop,
        inventory: toString_inventory
    }
};