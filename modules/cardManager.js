const { botSettings, userSettings, dropSettings, eventSettings, shopSettings } = require('../configs/heejinSettings.json');
const { markdown: { bold, italic, inline, quote, link, space } } = require('./discordTools');
const { randomTools } = require('./jsTools');
const logger = require('./logger');

const cards = {
    comn: require('../items/cards/cards_common.json'),
    uncm: require('../items/cards/cards_uncommon.json'),
    rare: require('../items/cards/cards_rare.json'),
    epic: require('../items/cards/cards_epic.json'),
    mint: require('../items/cards/cards_mint.json'),

    seas: require('../items/cards/cards_season.json'),
    holi: require('../items/cards/cards_holiday.json'),
    bday: require('../items/cards/cards_bday.json'),

    evnt: [
        ...require('../items/cards/cards_event1.json'),
        ...require('../items/cards/cards_event2.json'),
        ...require('../items/cards/cards_event3.json'),
    ],

    cust: require('../items/cards/cards_custom.json'),
    shop: require('../items/cards/cards_shop.json')
};

let cards_all = []; Object.values(cards).forEach(category => cards_all = [...cards_all, ...category]);
const cards_general = [...cards.comn, ...cards.uncm, ...cards.rare, ...cards.epic, ...cards.mint];

//! General
function createUID() {
    // Create a new UID for the card
    return randomTools.numberString(6);
}

function recalculateStats(card) {
    let card_base = get_byGlobalID(card.globalID !== "100" ? card.globalID : "101");
    if (!card_base) {
        logger.error("CardManager -> recalculateStats", "base card could not be found");
        return card;
    }

    // Reset it's stats back to its original base stats
    card.stats.ability = card_base.stats.ability;
    card.stats.reputation = card_base.stats.reputation;

    // Iterate through each level and increase the stats
    for (let i = 0; i < (card.stats.level - 1); i++) {
        let { xp: { card: { nextLevelStatReward } } } = userSettings;
        card.stats.ability += nextLevelStatReward.ability;
        card.stats.reputation += nextLevelStatReward.reputation;
    }

    // Reset how much XP the card needs to level up
    card.stats.xp_for_next_level = card.stats.level * userSettings.xp.card.nextLevelXPMultiplier;

    return card;
}

function tryLevelUp(card, session = null) {
    session = { leveled: false, levelsGained: 0, ...session };

    // Don't level the card past the max card level
    if (card.stats.level === userSettings.xp.card.maxLevel) return session;

    // Increase the card's level by 1 if they meet or surpass the required XP
    if (card.stats.xp >= card.stats.xp_for_next_level) {
        card.stats.level++;
        session.leveled = true; session.levelsGained++;

        // If the card's at its max level set its XP to its required xp_for_next_level
        if (card.stats.level === userSettings.xp.card.maxLevel)
            card.stats.xp = card.stats.xp_for_next_level;
        else {
            // Reset XP, keeping any overshoot
            // defaults to 0 if there wasn't a positive overshoot value
            card.stats.xp = (card.stats.xp - card.stats.xp_for_next_level) || 0;

            // Multiply the card's xp_for_next_level by its multipler
            card.stats.xp_for_next_level = Math.round(card.stats.level * userSettings.xp.card.nextLevelXPMultiplier);

            card = recalculateStats(card);

            // Recursively level up the card if there's still enough XP
            if (card.stats.xp >= card.stats.xp_for_next_level)
                return tryLevelUp(card, session);
        }
    }

    // Return whether the card was leveled up or not
    session.card = card; return session;
}

//! Fetch
function get_random(basicOnly = false) {
    return randomTools.choice(basicOnly ? cards_general : cards_all);
}

function get_byGlobalID(globalID) {
    let card = cards_all.find(card => card.globalID === globalID);
    return card || null;
}

/** @param {"general" | "weekly" | "season" | "event_1" | "event_2"} dropCategory */
function get_randomDrop(dropCategory) {
    let card_choices = [];

    switch (dropCategory) {
        case 'general':
            let categories = Object.values(dropSettings.chances).map(c => ({ ...c, rarity: c.chance }));
            let category_picked = randomTools.weightedChoice(categories);

            card_choices = cards_general.filter(card => card.rarity === category_picked.cardRarityFilter);
            break;
        case 'weekly':
            card_choices = cards.shop.filter(card => shopSettings.stockSetIDs.filter(id => id !== "100").includes(card.setID));
            break;
        case 'season':
            card_choices = cards.seas.filter(card => eventSettings.season.cardRarityFilter.includes(card.rarity));
            break;
        case 'event_1':
            card_choices = cards.evnt.filter(card => eventSettings.event1.cardRarityFilter.includes(card.rarity));
            break;
        case 'event_2':
            card_choices = cards.evnt.filter(card => eventSettings.event2.cardRarityFilter.includes(card.rarity));
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
        locked: card?.locked || false,
        stats: card.stats
    };
}

function parse_fromCardLike(cardLike) {
    return { ...get_byGlobalID(cardLike.globalID), ...cardLike };
}

//! To String
function toString_basic(card) {
    return "%UID %EMOJI %GROUP :: %SINGLE - %NAME %SELL_PRICE"
        .replace("%UID", inline(card.uid))
        .replace("%EMOJI", inline(card.emoji))
        .replace("%GROUP", bold(card.group))
        .replace("%SINGLE", card.single)
        .replace("%NAME", link(card.name, card.imageURL))
        .replace("%SELL_PRICE", inline("💰", card.sellPrice));
}

function toString_setEntry(card, count = 1, simplify = false) {
    if (count < 10) count = `0${count}`;

    return "%SET_ID %CARD_COUNT %CATEGORY %EMOJI %GROUP%SINGLE"
        .replace("%SET_ID", inline("🗣️", card.setID))

        .replace("%CARD_COUNT", inline("📁", count || 1))

        .replace("%CATEGORY", inline(card.category))
        .replace("%EMOJI", inline(card.emoji))
        .replace("%GROUP", bold(card.group))
        .replace("%SINGLE", simplify ? "" : space("left", `:: ${card.single}`));
}

function toString_missingEntry(card, missing = false) {
    return "%GLOBAL_ID %EMOJI %GROUP :: %SINGLE - %NAME\n> %SET_ID %RARITY %CATEGORY %MISSING"
        .replace("%GLOBAL_ID", inline(card.globalID))
        .replace("%EMOJI", inline(card.emoji))
        .replace("%GROUP", bold(card.group))
        .replace("%SINGLE", card.single)
        .replace("%NAME", link(card.name, card.imageURL))

        .replace("%SET_ID", inline("🗣️", card.setID))
        .replace("%RARITY", inline(`R${card.rarity}`))
        .replace("%CATEGORY", inline(card.category))

        .replace("%MISSING", inline(missing ? "🚫 missing" : "✔️ owned"));
}

function toString_shopEntry(card) {
    return "%GLOBAL_ID %EMOJI %GROUP :: %SINGLE : %NAME %SET_ID %PRICE"
        .replace("%GLOBAL_ID", inline(card.globalID))
        .replace("%EMOJI", inline(card.emoji))
        .replace("%GROUP", bold(card.group))
        .replace("%SINGLE", card.single)
        .replace("%NAME", link(card.name, card.imageURL))
        .replace("%SET_ID", inline("🗣️", card.setID))
        .replace("%PRICE", inline(botSettings.currencyIcon, card.price));
}

function toString_inventory(card, options = { duplicate_count: 0, favorited: false, selected: false, team: false, isDuplicate: false, simplify: false, }) {
    options = { duplicate_count: 0, favorited: false, selected: false, team: false, isDuplicate: false, simplify: false, ...options };

    // Special charactors
    let superscript = {
        number: ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"],
        dupe: "ᴰ ᵁ ᴾ ᴱ"
    };

    let { duplicate_count } = options;
    let formated = "%UID%EMOJI %GROUP : %SINGLE - %NAME %DUPE\n> %SET_ID %GLOBAL_ID %RARITY %CATEGORY %SELL_PRICE%LOCKED%NEW_LINE%LEVEL%STATS%FAVORITED%SELECTED%TEAM"
        .replace("%UID", card.uid ? space("right", inline(card.uid)) : "")
        .replace("%EMOJI", inline(card.emoji))

        .replace("%GROUP", bold(card.group))
        .replace("%SINGLE", card.single)
        .replace("%NAME", link(card.name, card.imageURL))

        .replace("%GLOBAL_ID", space("left", inline(card.globalID)))
        .replace("%SET_ID", inline("🗣️", card.setID))
        .replace("%RARITY", inline(`R${card.rarity}`))
        .replace("%CATEGORY", inline(card.category))

        .replace("%SELL_PRICE", inline("💰", card.sellPrice))
        .replace("%LOCKED", card.locked ? space("both", inline("🔒")) : "")

        .replace("%NEW_LINE", options.simplify ? "" : "\n")

        .replace("%LEVEL", options.simplify ? "" : quote(inline(`LV.${card.stats.level}`)))
        .replace("%STATS", options.simplify ? ""
            : space("left", inline("🎤", card.stats.ability), ":", inline("💖", card.stats.reputation)))

        .replace("%FAVORITED", options.favorited ? space("left", inline("⭐")) : "")
        .replace("%SELECTED", options.selected ? space("left", inline("🏃")) : "")
        .replace("%TEAM", options.team ? space("left", inline("👯")) : "");

    // For special cases with dupeified things
    if (options.isDuplicate)
        formated = formated.replace("%DUPE", bold(italic(superscript.dupe)));
    else if (options.duplicate_count > 0) {
        // Special charactor formatting
        let duplicate_count_f = String(duplicate_count).split("").map(num => superscript.number[+num]).join("");

        formated = formated.replace("%DUPE", bold("--", duplicate_count_f));
    }
    else
        formated = formated.replace("%DUPE", "");

    // Return the formated card
    return formated;
}

module.exports = {
    cards, cards_all, cards_general,
    cards_shop: cards_all.filter(card => shopSettings.stockSetIDs.includes(card.setID)),
    cardCount: cards_all.length,

    createUID,
    recalculateStats,
    tryLevelUp,

    get: {
        random: get_random,
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
        missingEntry: toString_missingEntry,
        shopEntry: toString_shopEntry,
        inventory: toString_inventory
    }
};