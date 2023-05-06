// Connects us to our Mongo database so we can save and retrieve data.

const { userSettings } = require('../configs/heejinSettings.json');
const badgeManager = require('./badgeManager');
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
                daily_streak_expires: 1,
                level: 1,
                xp: 1,
                xp_for_next_level: 1,
                biography: 1,
                balance: 1,
                cooldowns: 1,
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
    };

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
            userData.xp_for_next_level = Math.round(userData.level * userSettings.xp.nextLevelXPMultiplier);

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
async function cardInventory_addCards(userID, cards, resetUID = false) {
    // Convert a single card into an array
    if (!Array.isArray(cards)) cards = [cards];

    // Get the user's current cards for unique ID creation
    let userCards; if (resetUID) userCards = (await user_fetch(userID, "cards", true)).card_inventory;

    for (let card of cards) {
        // Reset the unique ID
        if (resetUID) card = cardManager.resetUID(card, userCards);

        // Convert the card object to a slimmer "CardLike" object
        card = cardManager.parse.toCardLike(card);
    }
    
    // Push the CardLikes to the user's card_inventory in Mongo
    await user_update(userID, { $push: { card_inventory: cards } }); return null;
}

async function cardInventory_removeCards(userID, uids) {
    // Convert a single card UID into an array
    if (!Array.isArray(uids)) uids = [uids];
    
    // Send the pull request to Mongo
    await user_update(userID, { $pull: { card_inventory: { uids } } }); return null;
}

async function cardInventory_sellCards(userID, cards) {
    // Convert a single card into an array
    if (!Array.isArray(cards)) cards = [cards];

    // Remove the cards from the user's card_inventory
    await cardInventory_removeCards(userID, cards.map(card => card.uid));

    // Get the user's balance
    let userData = await user_fetch(userID, "essential", true);

    // Add to the user's balance
    cards.forEach(card => userData.balance += card.sellPrice);

    // Update the user's balance in Mongo
    await user_update(userID, { balance: userData.balance }); return null;
}

async function cardInventory_updateCard(userID, card) {
    await models.user.updateOne(
        { _id: userID, "card_inventory.uid": card.uid },
        { $set: { "card_inventory.$": card } }
    );
    return null;
}

//! User -> Badges
async function userBadge_addBadge(userID, badges) {
    // Convert a single badge into an array
    if (!Array.isArray(badges)) badges = [badges];

    let promiseArray = [];
    for (let badge of badges) {
        // Convert the badge object to a slimmer "BadgeLike" object
        badge = badgeManager.parse.toBadgeLike(badge);

        // Push the BadgeLike to the user's badge array in Mongo
        promiseArray.push(user_update(userID, { $push: { badges: badge } }));
    }

    // Wait for mongo to finish
    await Promise.all(promiseArray); return null;
}

async function userBadge_removeBadge(userID, badgeIDs) {
    // Convert a single badge ID into an array
    if (!Array.isArray(badgeIDs)) badgeIDs = [badgeIDs];

    let promiseArray = [];
    for (let id of badgeIDs) {
        // Send a pull request to Mongo
        promiseArray.push(user_update(userID, { $pull: { badges: { id } } }));
    }

    // Wait for mongo to finish
    await Promise.all(promiseArray); return null;
}

module.exports = {
    /** Connect to MongoDB. */
    connect: async (uri = MONGO_URI) => {
        // Try to connect to MongoDB
        let connection = await new Promise((resolve, reject) => {
            return mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
                .then(() => resolve(true))
                .catch(err => reject(err));
        });

        // Log the success if successful
        if (connection) return logger.success("successfully connected to MongoDB");

        // Log the error if unsuccessful
        logger.error("failed to connect to MongoDB", null, connection);
    },

    userManager: {
        exists: user_exists,
        fetch: user_fetch,
        update: user_update,
        new: user_new,

        tryLevelUp: user_tryLevelUp,

        cards: {
            add: cardInventory_addCards,
            remove: cardInventory_removeCards,
            sell: cardInventory_sellCards,
            update: cardInventory_updateCard
        },

        badges: {
            add: userBadge_addBadge,
            remove: userBadge_removeBadge
        }
    }
};