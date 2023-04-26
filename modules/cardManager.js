const { inlineCode } = require('discord.js');

const { dropSettings, eventSettings, shopSettings } = require('../configs/heejinSettings.json');
const { randomTools } = require('./jsTools');

const cards = {
    common: require('../cards/cards_common.json'),
    uncommon: require('../cards/cards_uncommon.json'),
    rare: require('../cards/cards_rare.json'),
    epic: require('../cards/cards_epic.json'),
    mint: require('../cards/cards_mint.json'),

    seasonal: require('../cards/cards_seasonal.json'),
    holiday: require('../cards/cards_holiday.json'),
    bday: require('../cards/cards_bday.json'),

    event: [
        ...require('../cards/cards_event1.json'),
        ...require('../cards/cards_event2.json'),
        ...require('../cards/cards_event3.json'),
    ],

    custom: require('../cards/cards_custom.json'),
    shop: require('../cards/cards_shop.json')
};

let cards_all = []; Object.entries(cards).forEach(entry => cards_all = [...cards_all, ...entry[1]]);
const cards_basic = [...cards.common, ...cards.uncommon, ...cards.rare, ...cards.epic, ...cards.mint];

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
function get_byGlobalID(globalID) {
    let card = cards_all.find(card => card.globalID === globalID);
    return card || null;
}

/**
 * @param {"drop_5" | "weekly" | "seasonal" | "event"} dropCategory 
 */
function get_randomDrop(dropCategory) {
    let card_choices = [];

    switch (dropCategory) {
        case 'drop_5':
            let categories = Object.values(dropSettings.chances).map(c => ({ ...c, rarity: c.chance }));
            let category_picked = randomTools.weightedChoice(categories);

            card_choices = cards_basic.filter(card => card.rarity === category_picked.cardRarityFilter);
            break;
        case 'weekly':
            card_choices = cards.shop.filter(card => shopSettings.stockSetIDs.filter(id => id !== "100").includes(card.setID));
            break;
        case 'seasonal':
            card_choices = cards.seasonal.filter(card => eventSettings.season.cardRarityFilter.includes(card.rarity));
            break;
        case 'event':
            card_choices = cards.event.filter(card => eventSettings.cardRarityFilter.includes(card.rarity));
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
    return { ...get_byGlobalID(cardLike.globalID), ...cardLike };
}

//! To String
function inline(str, options = { spacing: false, separator: " " }) {
    if (!Array.isArray(str)) str = [str]
    options = { spacing: true, separator: " ", ...options };

    if (options.spacing)
        return `\` ${str.join(options.separator)} \``;
    else
        return `\`${str.join(options.separator)}\``;
}

function bold(str, options = { separator: " " }) {
    if (!Array.isArray(str)) str = [str]
    options = { separator: " ", ...options };

    return `**${str.join(options.separator)}**`;
}

function toString_basic(card) {
    return "%UID %EMOJI %GROUP :: %SINGLE - %NAME"
        .replace("%UID", inlineCode(card.uid))
        .replace("%EMOJI", inlineCode(card.emoji))
        .replace("%GROUP", bold(card.group))
        .replace("%SINGLE", card.single)
        .replace("%NAME", card.name);
}

function toString_setEntry(card, count = 1) {
    return "%SET_ID %CATEGORY %EMOJI %GROUP :: %SINGLE %RARITY %CARD_COUNT"
        .replace("%SET_ID", inline(card.setID, { spacing: true }))
        .replace("%CATEGORY", inline(card.category, { spacing: true }))
        .replace("%EMOJI", inline(card.emoji))
        .replace("%GROUP", bold(card.group))
        .replace("%SINGLE", card.single)
        .replace("%RARITY", inline(["R", card.rarity], { spacing: true, separator: "" }))

        .replace("%CARD_COUNT", inline(["📁", count || 1], { spacing: true }));
}

/** @param {{duplicate_count: number, favorited: boolean}} options */
function toString_inventory(card, options = { duplicate_count: 0, favorited: false }) {
    options = { duplicate_count: 0, favorited: false, ...options };

    let { duplicate_count } = options;
    return "%EMOJI %GROUP :: %SINGLE - %NAME :: LV. %LEVEL %DUPES\n> %UID%GLOBAL_ID %CATEGORY %SET_ID%LOCKED%FAVORITED\n> %ABILITY :: %REPUTATION"
        .replace("%EMOJI", inlineCode(card.emoji))
        .replace("%GROUP", bold(card.group))
        .replace("%SINGLE", card.single)
        .replace("%NAME", card.name)
        .replace("%LEVEL", card.stats.level)
        .replace("%DUPES", duplicate_count > 0 ? inlineCode(`${duplicate_count} ${duplicate_count > 1 ? "Dupes" : "Dupe"}`) : "")

        .replace("%UID", card.uid ? (inlineCode(card.uid) + " ") : "")
        .replace("%GLOBAL_ID", inlineCode(card.globalID))
        .replace("%CATEGORY", inlineCode(card.category))
        .replace("%SET_ID", inlineCode(`👥${card.setID}`))

        .replace("%LOCKED", card?.locked ? (" " + inlineCode("🔒")) : "")
        .replace("%FAVORITED", options.favorited ? (" " + inlineCode("🌟")) : "")

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
    cards, cards_all, cards_basic,
    cardTotal: cards_all.length,

    resetUID,

    get: {
        byGlobalID: get_byGlobalID,
        drop: get_randomDrop
    },

    parse: {
        toCardLike: parse_toCardLike,
        fromCardLike: parse_fromCardLike
    },

    toString: {
        basic: toString_basic,
        setEntry: toString_setEntry,
        drop: toString_drop,
        inventory: toString_inventory
    }
};