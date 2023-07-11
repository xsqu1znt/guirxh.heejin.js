const { arrayTools } = require('./jsTools');
const cardManager = require('./cardManager');

function cards_get(userData, uids, keepArray = false) {
    if (!Array.isArray(uids)) uids = [uids];
    let card_inventory = userData?.card_inventory || userData;

    // Get the cards from the user's card_inventory
    let cards = uids.map(uid => card_inventory.find(card => card.uid === uid.trim()) || null);

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
    let card_inventory = userData?.card_inventory || userData;
    let cards = card_inventory.filter(card => card.globalID === globalID);
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
    let card_inventory = userData?.card_inventory || userData;
    let vault = card_inventory.filter(card => card.locked) || [];

    return vault.map(cardLike => cardManager.parse.fromCardLike(cardLike));
}

function cards_getTeam(userData, keepNull = false) {
    let cards_team = cards_get(userData, userData.card_team_uids, true);
    if (!keepNull) cards_team = cards_team.filter(card => card);

    let team_ability_total = 0;
    let team_reputation_total = 0;

    if (cards_team.length) {
        team_ability_total = cards_team.map(card => card?.stats?.ability || 0).reduce((a, b) => a + b);
        team_reputation_total = cards_team.map(card => card?.stats?.reputation || 0).reduce((a, b) => a + b);
    }

    return {
        cards: cards_team,
        ability_total: team_ability_total,
        reputation_total: team_reputation_total
    };
}

function cards_getIdol(userData) {
    return cards_get(userData, userData.card_selected_uid);
}

function cards_getInventory(userData) {
    let cards = [];
    let cards_primary = arrayTools.unique(userData?.card_inventory || userData, "globalID");

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

const c_pI_options = { fromCardLike: true, unique: false };
function cards_parseInventory(userData, options = c_pI_options) {
    options = { ...c_pI_options, ...options };

    let card_inventory = userData?.card_inventory || userData;

    if (options.unique) card_inventory = arrayTools.unique(card_inventory, "globalID");

    if (options.fromCardLike) for (let i = 0; i < card_inventory.length; i++) {
        let card = cardManager.parse.fromCardLike(card_inventory[i]);
        card_inventory[i] = card || card_inventory[i];
    }

    return card_inventory;
}

function cards_setsCompleted(userData, setIDs) {
    if (!Array.isArray(setIDs)) setIDs = [setIDs];
    let card_inventory = cards_parseInventory(userData, { unique: true });

    let completed = [];

    for (let setID of setIDs) {
        if (!setID) continue;

        let user_set = card_inventory.filter(card => setIDs.includes(card.setID));
        completed.push(user_set.length >= cardManager.get.set(setID).length);
    }

    return completed.filter(b => b).length === setIDs.length;
}

function cards_hasDuplicates(userData, globalID, requiredCount = 0) {
    let { duplicateCount } = cards_getDuplicates(userData, globalID);

    return requiredCount ? (duplicateCount >= requiredCount ? true : false) : (duplicateCount > 0 ? true : false);
}

function cards_has(userData, globalIDs) {
    if (!Array.isArray(globalIDs)) globalIDs = [globalIDs];
    let card_inventory = cards_parseInventory(userData, { fromCardLike: false, unique: true });

    return card_inventory.filter(card => globalIDs.includes(card.globalID)).length === globalIDs.length;
}

/** Filter out duplicate cards from the user's card_inventory. */
function cards_primary(cardArray) {
    return arrayTools.unique(cardArray, "globalID");
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
        setsCompleted: cards_setsCompleted,
        hasDuplicates: cards_hasDuplicates,
        has: cards_has,

        primary: cards_primary,
        duplicates: cards_duplicates
    }
};