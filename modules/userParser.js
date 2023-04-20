const cardManager = require('./cardManager');

/** Get a card from the user's card_inventory. */
function cards_get(cardArray, uid) {
    let card = cardArray.find(card => card.uid === uid);
    return card ? cardManager.parse.fromCardLike(card) : null;
}

/** Get multiple cards from the user's card_inventory. */
function cards_getMultiple(cardArray, uids, filterInvalid = true) {
    let cards = uids.map(uid => cardArray.find(card => card.uid === uid));
    if (filterInvalid) cards = cards.filter(card => card);

    return cards.map(card => cardManager.parse.fromCardLike(card));
}

/* function cards_fetch(cardArray, filter = { uid: "" }) {
    let filter_default = { uid: null };
    filter = { ...filter_default, ...filter };

    if (filter.uid) return cardArray.find(card => card.uid === filter.uid);
    else {
        return cardArray;
    }
} */

/** Filter out duplicate cards from the user's card_inventory. */
function cards_primary(cardArray) {
    cardArray = cardArray.reduce((accumulator, current) => {
        if (!accumulator.find(c => c.globalID === current.globalID)) accumulator.push(current);

        return accumulator;
    }, []);

    return cardArray;
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

    return { card_primary, card_duplicates };
}

module.exports = {
    cards: {
        get: cards_get,
        getMultiple: cards_getMultiple,
        primary: cards_primary,
        duplicates: cards_duplicates
    }
};