const { inlineCode, bold } = require('discord.js');
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

/**
 * @param {"drop" | "drop_3_4" | "weekly" | "seasonal" | "event"} dropCategory 
 */
function randomDrop(dropCategory) {
    let cardChoices = [];

    switch (dropCategory) {
        case 'drop':
            cardChoices = [...cards.common, ...cards.uncommon, ...cards.rare, ...cards.epic, ...cards.mint];
            break;
        case 'drop_3_4':
            cardChoices = [...cards.rare, ...cards.epic, ...cards.mint];
            break;
        case 'weekly':
            cardChoices = cards.weekly;
            break;
        case 'seasonal':
            cardChoices = cards.seasonal;
            break;
        case 'event':
            cardChoices = cards.event;
            break;
    }

    // Return a random card from the list
    return randomTools.choice(cardChoices) || null;
}

module.exports = {
    randomDrop,

    // Formatting
    format: {
        drop: (card) => "%EMOJI %GROUP - %SINGLE : %NAME\n> %UID %GLOBAL_ID %CATEGORY %SET_ID\n> %ABILITY :: %REPUTATION"
            .replace("%EMOJI", inlineCode(card.emoji))
            .replace("%GROUP", bold(card.group))
            .replace("%SINGLE", card.single)
            .replace("%NAME", card.name)
            .replace("%UID", inlineCode(card.uid))
            .replace("%GLOBAL_ID", inlineCode(card.global_id))
            .replace("%CATEGORY", inlineCode(card.category))
            .replace("%SET_ID", inlineCode(`👥${card.set_id}`))
            .replace("%ABILITY", inlineCode(`🎤 ABI. ${card.stats.ability}`))
            .replace("%REPUTATION", inlineCode(`💖 REP. ${card.stats.reputation}`))
    }
};