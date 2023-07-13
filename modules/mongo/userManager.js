/** @typedef UserData
 * @property {string} _id
 * 
 * @property {number} daily_streak
 * @property {number} daily_streak_expires
 * 
 * @property {number} level
 * @property {number} xp
 * @property {number} xp_for_next_level
 * 
 * @property {string} biography
 * @property {number} balance
 * @property {number} ribbons
 * 
 * @property {UserBadge[]} badges
 * 
 * @property {string} card_selected_uid
 * @property {string} card_favorite_uid
 * @property {string[]} card_team_uids
 * @property {CardLike[]} card_inventory
 * 
 * @property {UserCommandCooldown[]} cooldowns
 * @property {UserReminderType[]} reminders
 * 
 * @property {UserQuestPartial[]} quests_complete
 * @property {number} timestamp_started */

/** @typedef UserDataType
 * @type {"id"|"full"|"inventory"|"noInventory"|"essential"|"balance"|"xp"|"reminder"|"quest"} */

/** @typedef UserDataFetchOptions
 * @property {UserDataType} type
 * @property {boolean} lean
 * @property {boolean} upsert
 * @property {boolean} awaitQueueCleared */

const playerConfig = require('../../configs/config_player.json');

const { numberTools } = require('../jsTools');

// const badgeManager = require('./badgeManager');
const cardManager = require('../cardManager');
// const userParser = require('./userParser');
// const logger = require('./logger');

// Models
const { model: userModel } = require('../../models/userModel');
const models = { user: userModel };

// Queues
const MongoQueueManager = require('./queueManager');
const queues = {
    userData: { update: new MongoQueueManager(models.user) }
};

//! UserData
async function userData_count() {
    return await models.user.count();
}

/** @param {string} userID @param {boolean} upsert */
async function userData_exists(userID, upsert = false) {
    let exists = await models.user.exists({ _id: userID });

    if (!exists && upsert) await userData_insertNew(userID);

    return exists || upsert ? true : false;
}

/** @param {string} userID @param {{}} query */
async function userData_insertNew(userID, query = {}) {
    /** @type {UserData} */
    let userData = await userData_fetch(userID);

    // Save a new UserData document if it doesn't exist
    userData ||= await (new models.user({
        _id: userID, balance: playerConfig.currency.STARTING_BALANCE, timestamp_started: Date.now(),
        ...query
    })).save();

    return userData;
}

/** @param {string} userID @param {UserDataFetchOptions} options */
async function userData_fetch(userID, options = {}) {
    options = { type: "full", lean: true, upsert: false, awaitQueueCleared: false, ...options };

    // Insert a new UserData document if it doesn't exist
    if (options.upsert) await userData_exists(userID, true);

    // Wait for the Mongo update queue to be clear
    if (options.awaitQueueCleared) await queues.userData.update.on_findByIdAndUpdate_queueCleared(userID);

    // Determine filter type
    let fetchFilter = {};
    switch (options.type) {
        case "id": fetchFilter = { _id: 1 }; break;
        case "full": fetchFilter = { __v: 0 }; break;
        case "inventory": fetchFilter = {
            _id: 1, card_selected_uid: 1, card_favorite_uid: 1, card_team_uids: 1, card_inventory: 1
        }; break;
        case "noInventory": fetchFilter = { card_inventory: 0 }; break;
        case "essential": fetchFilter = {
            _id: 1, timestamp_started: 1,
            daily_streak: 1, daily_streak_reminder: 1,
            level: 1, xp: 1, xp_for_next_level: 1,
            biography: 1, balance: 1, ribbons: 1
        }; break;
        case "balance": fetchFilter = { _id: 1, balance: 1, ribbons: 1 }; break;
        case "xp": fetchFilter = { _id: 1, level: 1, xp: 1, xp_for_next_level: 1 }; break;
        case "reminder": fetchFilter = { _id: 1, daily_streak: 1, daily_streak_expires: 1, cooldowns: 1, reminders: 1 }; break;
        case "quest": fetchFilter = { _id: 1, quests_complete: 1 }; break;
        default: fetchFilter = { __v: 0 }; break;
    }

    /// Fetch the user from the database
    /** @type {UserData | UserData[]} */
    let userData;

    if (userID) options.lean
        ? userData = await models.user.findById(userID, fetchFilter).lean()
        : userData = await models.user.findById(userID, fetchFilter);
    else options.lean
        ? userData = await models.user.find({}, fetchFilter).lean()
        : userData = await models.user.find({}, fetchFilter);

    return userData;
}

/** @param {string | {_id: string}} filter userID or filter @param {{}} query @param {{addToQueue:boolean}} options  */
async function userData_update(filter, query, options = {}) {
    options = { addToQueue: false, ...options };

    if (typeof filter === "object") return options.addToQueue
        ? await queues.userData.update.updateOne(filter, query)
        : await models.user.updateOne(filter, query);

    else return options.addToQueue
        ? await queues.userData.update.findByIdAndUpdate(filter, query)
        : await models.user.findByIdAndUpdate(filter, query);
}

//! UserData -> XP
/** @param {string} userID @param {number} amount use a negative number to subtract */
async function xp_increment(userID, amount) {
    await userData_update(userID, { $inc: { xp: amount } }); return;
}

/** @param {string} userID */
async function xp_levelUp(userID) {
    // Fetch the user from Mongo
    let userData = await userData_fetch(userID, { type: "xp", awaitQueueCleared: true });

    // Used to keep track of what happened
    let session = {
        leveled: false, levels_gained: 0,

        /** @type {number} */
        level_current: userData.level
    };

    const levelUp = () => {
        if (userData.level >= playerConfig.xp.user.LEVEL_MAX) return;

        if (userData.xp >= userData.xp_for_next_level) {
            // Subtract the required XP to level up from the user
            userData.xp = (userData.xp - userData.xp_for_next_level) || 0;

            // Increase the user's level
            userData.level++;

            // Calculate the XP required for the next level
            userData.xp_for_next_level = Math.floor(userData.level * playerConfig.xp.user.LEVEL_XP_MULTIPLIER);

            // Update session data
            session.levels_gained++; session.leveled = true;
        }
    };

    // Level up the user until they can't anymore
    while (userData.xp >= userData.xp_for_next_level) levelUp();

    // Push the update to Mongo
    if (session.leveled) await userData_update(userID, {
        level: userData.level, xp: userData.xp, xp_for_next_level: userData.xp_for_next
    });

    return session;
}

//! UserData -> Cards
/** @param {string} userID @param {string | string[]} uids */
async function inventory_exists(userID, uids) {
    // Create an array if only a single card UID was passed
    if (!uids) return false; if (!Array.isArray(uids)) uids = [uids];

    let exists = await models.user.exists({ _id: userID, "card_inventory.uid": { $all: uids } });
    return exists ? true : false;
}

/** @param {string} userID */
async function inventory_add(userID, cards) {
    // Create an array if only a single card object was passed
    // filtering out invalid cards in the process
    if (!cards) return; if (!Array.isArray(cards)) cards = [cards].filter(card => card?.globalID);

    // Fetch the user's card_inventory
    let { card_inventory } = await userData_fetch(userID, { type: "inventory" });

    // Parse the user's CardLikes into an array of uids to compare
    let uidList = card_inventory.map(card => card?.uid).filter(uid => uid);

    // Parse the given cards
    let cards_parsed = structuredClone(cards);

    for (let card of cards_parsed) {
        // Reset the card's UID if necessary
        while (!card?.uid || uidList.includes(card?.uid)) cardManager.resetUID(card);

        // Add the new UID to the list
        uidList.push(card.uid);

        // Convert the card into a slimmer CardLike object (ignores custom cards)
        card = cardManager.parse.toCardLike(card);
    }

    // Push the new cards to the user's card_inventory
    await userData_update(userID, { $push: { card_inventory: { $each: cards_parsed } } });

    // Add the new cards' UIDs to the given card array
    cards.forEach((card, idx) => card.uid = `${cards_parsed[idx].uid}`); return;
}

/** @param {string} userID @param {string | string[]} uids */
async function inventory_remove(userID, uids) {
    // Create an array if only a single card UID was passed
    if (!uids) return; if (!Array.isArray(uids)) uids = [uids];

    // Send a pull request to Mongo
    await userData_update(userID, { $pull: { card_inventory: { uid: { $in: uids } } } }); return;
}

/** @param {string} userID */
async function inventory_update(userID, card) {
    await userData_update(
        { _id: userID, "card_inventory.uid": card.uid },
        { $set: { "card_inventory.$": card } }
    ); return;
}

/** @param {string} userID */
async function inventory_sell(userID, cards) {
    // Create an array if only a single card was passed
    if (!cards) return; if (!Array.isArray(cards)) cards = [cards];

    // Check if the user still has the cards in their card_inventory
    if (!inventory_exists(userID, cards.map(card => card.uid))) return false;

    await Promise.all([
        // Update the user's balance
        userData_update(userID, { $inc: { balance: numberTools.sum(cards, "sellPrice") } }),
        // Remove the cards from the user's card_inventory
        inventory_remove(userID, cards.map(card => card.uid))
    ]); return true;
}

//! UserData -> Badges
/** @param {string} userID */
async function badges_add(userID, badges) {
    // Create an array if only a single badge object was passed
    // filtering out invalid badges in the process
    if (!badges) return; if (!Array.isArray(badges)) badges = [badges].filter(badges => badges?.id);

    // Push the new badges to the user's badge array
    return await userData_update(userID, { $push: { badges: { $each: badges } } });
}

module.exports = {
    count: userData_count,
    exists: userData_exists,
    insertNew: userData_insertNew,
    fetch: userData_fetch,
    update: userData_update,

    xp: {
        increment: xp_increment,
        levelUp: xp_levelUp
    },

    inventory: {
        exists: inventory_exists,
        add: inventory_add,
        remove: inventory_remove,
        update: inventory_update,
        sell: inventory_sell
    },

    badges: {
        add: badges_add
    }
};