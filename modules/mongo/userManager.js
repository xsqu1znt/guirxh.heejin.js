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
 * @type {"id"|"full"|"essential"|"reminders"|"quest"|"cards"} */

/** @typedef UserDataFetchOptions
 * @property {UserDataType} type
 * @property {boolean} lean
 * @property {boolean} upsert */

const playerConfig = require('../../configs/config_player.json');

const { stringTools, numberTools, randomTools, dateTools } = require('../modules/jsTools');

const badgeManager = require('./badgeManager');
const cardManager = require('./cardManager');
const userParser = require('./userParser');
const logger = require('./logger');

// Models
const { model: userModel } = require('../../models/userModel');
const models = { user: userModel };

//! UserData
/** @param {string} userID @param {boolean} upsert */
async function userData_exists(userID, upsert = false) {
    let exists = await models.user.exists({ _id: userID });

    if (!exists && upsert) await userData_insertNew(userID);

    return exists ? true : false;
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

    let fetchFilter = {};
    switch (options.type) {
        case "id": fetchFilter = {}; break;
        case "full": fetchFilter = {}; break;
        case "inventory": fetchFilter = {}; break;
        case "essential": fetchFilter = {}; break;
        case "reminder": fetchFilter = {}; break;
        case "quest": fetchFilter = {}; break;
    }
}