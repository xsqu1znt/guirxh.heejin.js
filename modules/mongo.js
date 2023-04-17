// Connects us to our Mongo database so we can save and retrieve data.

const { userSettings } = require('../configs/heejinSettings.json');
const cardManager = require('./cardManager');
const logger = require('./logger');

// Models
const models = {
    user: require('../models/userModel')
};

const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URI;

//! User
async function user_exists(userID) {
    let exists = await models.user.exists({ _id: userID });
    return exists ? true : false;
}

/**
 * @param {"full" | "essential" | "cards" | "!cards"} type 
 */
async function user_fetch(userID, type = "full", lean = false) {
    let filter = {};
    let user;

    switch (type) {
        case "full": filter = { __v: 0 }; break;
        case "essential":
            filter = {
                daily_streak: 1,
                level: 1,
                xp: 1,
                xp_for_next_level: 1,
                biography: 1,
                balance: 1,
                cooldowns: 1,
                xp_for_next_level: 1,
                xp_for_next_level: 1,
            };
            break;
        case "cards": filter = { _id: 0, card_inventory: 1 }; break;
        case "!cards": filter = { card_inventory: 0, __v: 0 }; break;
    }

    if (userID) {
        if (lean) user = await models.user.findById(userID, filter).lean();
        else user = await models.user.findById(userID, filter);
    } else {
        if (lean) user = await models.user.find({}, filter).lean();
        else user = await models.user.find({}, filter);
    }

    return user || null;
}

async function user_update(userID, update) {
    return await models.user.findByIdAndUpdate(userID, update);
}

async function user_new(userID) {
    let user = await models.user.findById(userID);
    user ||= await new models.user({
        _id: userID,
        balance: userSettings.currency.startingBalance,
        timestamp_started: Date.now()
    }).save();

    return user || null;
}

async function user_tryLevelUp(userID, userData = null) {
    let res = {
        leveled: userData?.session_res?.leveled || false,
        levels_gained: userData?.session_res?.levels_gained || 0,
        level_current: userData?.session_res?.level_current || null
    }

    // Fetch the user from the database
    userData ||= await user_fetch(userID, "essential", true);
    if (!userData) return res;

    // Set the response's (level_current) property to the user's current level instead of null
    res.level_current = userData.level;

    // Don't level the player past the max user level
    if (userData.level === userSettings.xp.maxLevel) return res;

    // Keep track of what's happening during this session so the information crosses over with each recursion loop
    userData.session_res = res;

    // Level the user by 1 if they meet or surpass the required (xp) for their next level
    if (userData.xp >= userData.xp_for_next_level) {
        // Increase the user's level by 1
        userData.level++;
        userData.session_res.level_current = userData.level;
        userData.session_res.levels_gained++;
        userData.session_res.leveled = true;

        // If the user's at their max level set their current (xp) to their required (xp_for_next_level)
        if (userData.level === userSettings.xp.maxLevel)
            userData.xp = userData.xp_for_next_level;
        else {
            // Reset their (xp) while keeping their previous (xp) overshoot if any
            // defaulting to 0 if there wasn't a positive overshoot value
            userData.xp = (userData.xp - userData.xp_for_next_level) || 0;

            // Multiply the user's (xp_for_next_level) by its multipler
            userData.xp_for_next_level = Math.round(userData.level * userSettings.xp.xpMultiplier);

            // Recursively level up the user if they still have enough (xp)
            if (userData.xp >= userData.xp_for_next_level)
                return await user_tryLevelUp(userID, userData);
        }
    }

    // Update the (res) object
    res = userData.session_res;

    // Remove the (session_res) property from (userData) because it isn't needed outside of this function
    delete userData.session_res;

    // Push the update to Mongo
    await user_update(userID, { level: userData.level, xp: userData.xp, xp_for_next_level: userData.xp_for_next_level });

    // Return the answer
    return res;
}

//! User -> Card Inventory
async function userInventory_addCards(userID, cards, resetUID = false) {
    // Convert a single card into an array
    if (!Array.isArray(cards)) cards = [cards];

    // Get the user's current card for unique ID creation
    let userCards; if (resetUID) userCards = { cards } = await user_fetch(userID, "cards", true);

    for (let card of cards) {
        // Reset the unique ID
        if (resetUID) cardManager.resetUID(card, userCards)

        let { CardsV2: cards } = await models.userInventory.findOne({ UserID: userID }, { CardsV2: 1, _id: 0 });

        // Add the card to the user's inventory
        cards.set(String(card.CardID), card);

        // Push the update to the database
        await models.userInventory.updateOne({ UserID: userID }, { CardsV2: cards });
    }
}

module.exports = {
    /** Connect to MongoDB */
    connect: () => {
        mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
            .then(() => logger.success("successfully connected to MongoDB"))
            .catch(err => logger.error("failed to connect to MongoDB", null, err));
    },

    userManager: {
        exists: user_exists,
        fetch: user_fetch,
        update: user_update,
        new: user_new,
        tryLevelUp: user_tryLevelUp
    }
};