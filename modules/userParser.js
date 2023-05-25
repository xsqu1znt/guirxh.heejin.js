const { arrayTools } = require('./jsTools');
const cardManager = require('./cardManager');

/** Get a card from the user's card_inventory. */
function cards_get(userData, uid) {
    let cardInventory = userData?.card_inventory || userData;

    let card = cardInventory.find(card => card.uid === uid);
    return card ? cardManager.parse.fromCardLike(card) : null;
}

/** Get multiple cards from the user's card_inventory. */
function cards_getMultiple(cardArray, uids, filterInvalid = true) {
    let cards = uids.map(uid => cardArray.find(card => card.uid === uid) || null);
    if (filterInvalid) cards = cards.filter(card => card);

    return cards.map(card => card ? cardManager.parse.fromCardLike(card) : card);
}

function cards_getDuplicates(userData, globalID) {
    let cardInventory = userData?.card_inventory || userData;
    let cards = cardInventory.filter(card => card.globalID === globalID);

    let primary = cards.shift();
    let duplicates = cards;

    return {
        primary, duplicates,
        duplicateCount: duplicates.length,
        all: [primary, ...duplicates]
    };
}

function cards_getVault(userData) {
    let cardInventory = userData?.card_inventory || userData;

    return cardInventory.filter(card => card.locked) || [];
}

function cards_getTeam(userData) {
    return userData.card_inventory.filter(card => userData.card_team_uids.includes(card.uid)) || [];
}

/** Filter out duplicate cards from the user's card_inventory. */
function cards_primary(cardArray) {
    return arrayTools.unique(cardArray, (card, compareCard) => card.globalID === compareCard.globalID);
}

/** Return all duplicates of the given card found using the filter.
 * @param {{uid: string, globalID: string}} filter 
 */
function cards_duplicates(cardArray, filter = { uid: "", globalID: "" }) {
    filter = { uid: "", globalID: "", ...filter };

    // Find the card in the user's card_inventory using the provided filter
    let card_primary;
    if (filter.uid) card_primary = cardArray.find(card => card.uid === filter.uid);
    else if (filter.globalID) card_primary = cardArray.find(card => card.globalID === filter.globalID);

    // Return null if the card wasn't found
    if (!card_primary) return null;

    // Get the duplicate cards from the user's card_inventory
    let card_duplicates = cardArray.filter(card => card.globalID === card_primary.globalID);

    // Remove the first card in the array because that's the primary card
    card_duplicates.shift();

    return { card_primary, card_duplicates, cards: [card_primary, ...card_duplicates] };
}

module.exports = {
    cards: {
        get: cards_get,
        getMultiple: cards_getMultiple,
        getDuplicates: cards_getDuplicates,
        getVault: cards_getVault,
        getTeam: cards_getTeam,
        primary: cards_primary,
        duplicates: cards_duplicates
    }
};