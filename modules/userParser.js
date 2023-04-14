// Get a card from the user's card_inventory
function cards_fetch(cardArray, uid) {
    return cardArray.find(card => card.uid === uid) || null;
}

/* function cards_fetch(cardArray, filter = { uid: "" }) {
    let filter_default = { uid: null };
    filter = { ...filter_default, ...filter };

    if (filter.uid) return cardArray.find(card => card.uid === filter.uid);
    else {
        return cardArray;
    }
} */

module.exports = {
    cardnventoryParser: {
        fetch: cards_fetch
    }
};