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
 * @type {"id"|"full"|"inventory"|"noInventory"|"essential"|"reminder"|"quest"} */

/** @typedef UserDataFetchOptions
 * @property {UserDataType} type
 * @property {boolean} lean
 * @property {boolean} upsert */

const playerConfig = require('../../configs/config_player.json');

// const { stringTools, numberTools, randomTools, dateTools } = require('../modules/jsTools');

const badgeManager = require('./badgeManager');
const cardManager = require('./cardManager');
const userParser = require('./userParser');
const logger = require('./logger');

// Models
const { model: userModel } = require('../../models/userModel');
const models = { user: userModel };

// Queues
const queues = {
    userData: { update: new Map() }
}

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
    options = { type: "full", lean: true, upsert: false, ...options };

    // Insert a new UserData document if it doesn't exist
    if (options.upsert) await userData_exists(userID, true);

    // Determine filter type
    let fetchFilter = {};
    switch (options.type) {
        case "id": fetchFilter = { _id: 1 }; break;
        case "full": fetchFilter = { __v: 0 }; break;
        case "inventory": fetchFilter = { card_selected_uid: 1, card_favorite_uid: 1, card_team_uids: 1, card_inventory: 1 }; break;
        case "noInventory": fetchFilter = { card_inventory: 0 }; break;
        case "essential": fetchFilter = {
            _id: 1, timestamp_started: 1,
            daily_streak: 1, daily_streak_reminder: 1,
            level: 1, xp: 1, xp_for_next_level: 1,
            biography: 1, balance: 1, ribbons: 1,
        }; break;
        case "reminder": fetchFilter = { daily_streak: 1, daily_streak_expires: 1, cooldowns: 1, reminders: 1 }; break;
        case "quest": fetchFilter = { quests_complete: 1 }; break;
        default: fetchFilter = { __v: 0 }; break;
    }

    /// Fetch the user from the database
    /** @type {UserData | UserData[]} */
    let userData;

    if (userID) lean
        ? userData = await models.user.findById(userID, fetchFilter).lean()
        : userData = await models.user.findById(userID, fetchFilter);
    else lean
        ? userData = await models.user.find({}, fetchFilter).lean()
        : userData = await models.user.find({}, fetchFilter);

    return userData;
}

/** @param {string} userID @param {{}} query */
async function userData_update(userID, query) {

}