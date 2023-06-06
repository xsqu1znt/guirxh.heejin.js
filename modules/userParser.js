const { arrayTools } = require('./jsTools');
const cardManager = require('./cardManager');

function cards_get(userData, uids, keepArray = false) {
    if (!Array.isArray(uids)) uids = [uids];
    let cardInventory = userData?.card_inventory || userData;

    // Get the cards from the user's card_inventory
    let cards = uids.map(uid => cardInventory.find(card => card.uid === uid.trim()) || null);

    // Parse the cards into full card objects
    cards = cards.map(card => card ? cardManager.parse.fromCardLike(card) : null);

    // Return a single card, or an array of cards
    return (cards.length === 1 && !keepArray) ? cards[0] : cards;
}

function cards_getMultiple_DEPRECATED(cardArray, uids, filterInvalid = true) {
    let cards = uids.map(uid => cardArray.find(card => card.uid === uid) || null);
    if (filterInvalid) cards = cards.filter(card => card);

    return cards.map(card => card ? cardManager.parse.fromCardLike(card) : card);
}

function cards_getDuplicates(userData, globalID) {
    let cardInventory = userData?.card_inventory || userData;
    let cards = cardInventory.filter(card => card.globalID === globalID);
    cards = cards.map(cardLike => cardManager.parse.fromCardLike(cardLike));

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
    let vault = cardInventory.filter(card => card.locked) || [];

    return vault.map(cardLike => cardManager.parse.fromCardLike(cardLike));
}

function cards_getTeam(userData) {
    return cards_get(userData, userData.card_team_uids, true);
}

function cards_getIdol(userData) {
    return cards_get(userData, userData.card_selected_uid);
}

function cards_parseInventory(userData) {
    let cardInventory = userData?.card_inventory || userData;

    for (let i = 0; i < cardInventory.length; i++) {
        let card = cardManager.parse.fromCardLike(cardInventory[i]);
        cardInventory[i] = card || cardInventory[i];
    }

    return cardInventory;
}

function cards_getInventory(userData) {
    let cards = [];
    let cards_primary = arrayTools.unique(userData.card_inventory, (a, b) => a.globalID === b.globalID);

    for (let card of cards_primary) {
        let { duplicateCount } = cards_getDuplicates(userData, card.globalID);

        // Whether or not this is the user's favorited card
        let _isFavorite = (card.uid === userData.card_favorite_uid);

        // Whether or not this is the user's selected card
        let _isSelected = (card.uid === userData.card_selected_uid);

        // Whether or not this is on the user's team
        let _isOnTeam = (userData.card_team_uids.includes(card.uid));

        let _card_f = cardManager.toString.inventory(card, {
            duplicateCount, favorited: _isFavorite, selected: _isSelected, team: _isOnTeam
        });

        cards.push({
            card, card_f: _card_f,
            isFavorite: _isFavorite, isSelected: _isSelected, isOnTeam: _isOnTeam,
        });
    }

    return cards;
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
        getMultiple: cards_getMultiple_DEPRECATED,
        getDuplicates: cards_getDuplicates,
        getInventory: cards_getInventory,
        getVault: cards_getVault,
        getTeam: cards_getTeam,
        getIdol: cards_getIdol,

        parseInventory: cards_parseInventory,

        primary: cards_primary,
        duplicates: cards_duplicates
    }
};