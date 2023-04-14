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
    randomDrop
};