// Connects us to our Mongo database so we can save and retrieve data.

const { userSettings } = require('../configs/heejinSettings.json');
const { stringTools, numberTools, randomTools, dateTools } = require('../modules/jsTools');
const badgeManager = require('./badgeManager');
const questManager = require('./questManager');
const cardManager = require('./cardManager');
const userParser = require('./userParser');
const mongoose = require('mongoose');
const logger = require('./logger');

const MONGO_URI = process.env.MONGO_URI || require('../configs/clientSettings.json').MONGO_URI;

// Models
const models = {
    guild: require('../models/guildModel'),
    user: require('../models/userModel')
};

/** @type {"drop_general" | "drop_weekly" | "drop_season" | "drop_event_1" | "drop_event_2" | "daily" | "stage" | "random"} */
const cooldownTypes = null;

//! Guild
async function guild_exists(guildID) {
    let exists = await models.guild.exists({ _id: guildID });
    return exists ? true : false;
}

async function guild_fetch(guildID) {
    let guild = await models.guild.findById(guildID);

    guild ||= await new models.guild({ _id: guildID }).save();
    return guild;
}

async function guild_fetchAll() {
    return await models.guild.find();
}

async function guild_update(guildID, update) {
    return await models.guild.findByIdAndUpdate(guildID, update);
}

//! Guild -> Reminders
/** @param {cooldownTypes} reminderType */
async function guildReminder_add(guildID, channelID, user = { id: "", name: "" }, reminderType) {
    if (!await guild_exists(guildID)) await guild_fetch(guildID);

    // Create the reminder object
    let reminder = {
        id: randomTools.alphaNumericString(6, true),
        guildID, channelID, user,
        type: reminderType,

        message: `> \`⏰ ${stringTools.toTitleCase(reminderType.replace(/_/g, " "))}\` is **available**!`,
        timestamp: dateTools.fromNow(userSettings.cooldowns[reminderType] || 0)
    };

    // Push the new reminder to Mongo
    await guild_update(guildID, { $push: { reminders: reminder } }); return reminder;
}

async function guildReminder_remove(guildID, reminderID) {
    if (!await guild_exists(guildID))
        return logger.error("Remove guild reminder", "guild not found");

    // Send a pull request to Mongo
    await guild_update(guildID, { $pull: { reminders: { id: reminderID } } }); return null;
}

//! User
async function user_exists(userID) {
    let exists = await models.user.exists({ _id: userID });
    return exists ? true : false;
}

async function user_count() {
    return await models.user.count();
}

/** @param {"id" | "full" | "essential" | "reminders" | "quest" | "cards"} type */
async function user_fetch(userID, type = "full", lean = true) {
    let filter = {};
    let user;

    switch (type) {
        case "id": filter = { _id: 1 }; break;
        case "full": filter = { __v: 0 }; break;
        case "essential": filter = { card_inventory: 0 }; break;
        case "reminders": filter = { daily_streak: 1, cooldowns: 1, reminders: 1 }; break;
        case "quest": filter = { quests_completed: 1, quest_cache: 1 }; break;
        case "cards": filter = { card_inventory: 1 }; break;
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
    return await models.user.findByIdAndUpdate(userID, update, { new: true });
}

async function user_new(userID, query = null) {
    let user = await models.user.findById(userID);

    if (query) user ||= await new models.user(query).save();
    else user ||= await new models.user({
        _id: userID,
        balance: userSettings.currency.startingBalance,
        timestamp_started: Date.now()
    }).save();

    return user || null;
}

//! User -> XP
async function userXP_add(userID, amount) {
    let userData = await user_fetch(userID, "essential", true);
    await user_update(userID, { xp: (userData.xp + amount) }); return;
}

async function userXP_tryLevelUp(userID, userData = null) {
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
                return await userXP_tryLevelUp(userID, userData);
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
async function userCard_add(userID, cards) {
    // Create an array if only a single card object was passed
    if (!Array.isArray(cards)) cards = [cards];

    /// Get an array of all the card UIDs in the user's card_inventory to avoid duplicates
    // Fetch the user's card_inventory
    let { card_inventory } = await user_fetch(userID, "cards", true);

    // Get only the card UIDs from the card_inventory
    let existingUIDs = card_inventory.map(card => card?.uid);

    /// Parse the given cards
    let cards_parsed = [];

    for (let i = 0; i < cards.length; i++) {
        if (!cards[i]?.uid) cardManager.resetUID(cards[i]);

        // Recursivly reset the card's UID if another card exists with the same UID
        while (existingUIDs.includes(cards[i].uid)) cardManager.resetUID(cards[i]);

        // Keep track of the new UID
        existingUIDs.push(cards[i].uid);

        /// Convert the card object into a slimmer CardLike object, ignoring customs
        cards_parsed.push(["100"].includes(cards[i].rarity) ? cards[i] : cardManager.parse.toCardLike(cards[i]));
    }

    // Push the cards to the user's card_inventory in Mongo
    await user_update(userID, { $push: { card_inventory: { $each: cards_parsed } } });
}

async function userCard_remove(userID, uids) {
    // Convert a single card UID into an array
    if (!Array.isArray(uids)) uids = [uids];

    // Send the pull request to Mongo
    await user_update(userID, { $pull: { card_inventory: { uid: { $in: uids } } } });
}

async function userCard_update(userID, card) {
    await models.user.updateOne(
        { _id: userID, "card_inventory.uid": card.uid },
        { $set: { "card_inventory.$": card } }
    );
}

async function userCard_sell(userID, cards, checkExists = true) {
    // Convert a single card into an array
    if (!Array.isArray(cards)) cards = [cards];

    // Get the user's balance
    let userData = await user_fetch(userID, checkExists ? "full" : "essential", true);

    // Check if the user still has the given cards in their inventory
    cards = cards.filter(card => userParser.cards.get(userData, card.uid));
    if (!cards.length) return false;

    // Add to the user's balance
    cards.forEach(card => userData.balance += card.sellPrice);

    await Promise.all([
        // Update the user's balance in Mongo
        user_update(userID, { balance: userData.balance }),
        // Remove the cards from the user's card_inventory
        userCard_remove(userID, cards.map(card => card.uid))
    ]); return true;
}

//! User -> Badges
async function userBadge_addBadge(userID, badges) {
    // Convert a single badge into an array
    if (!Array.isArray(badges)) badges = [badges];

    // Convert the badge object to a slimmer "BadgeLike" object
    for (let badge of badges)
        badge = badgeManager.parse.toBadgeLike(badge);

    // Push the BadgeLikes to the user's badge array in Mongo
    await user_update(userID, { $push: { badges: { $each: badges } } }); return null;
}

async function userBadge_removeBadge(userID, badgeIDs) {
    // Convert a single badge ID into an array
    if (!Array.isArray(badgeIDs)) badgeIDs = [badgeIDs];

    // Send the pull request to Mongo
    await user_update(userID, { $pull: { badges: { id: { $in: badgeIDs } } } }); return null;
}

//! User -> Cooldowns
/** @param {cooldownTypes} cooldownType */
async function userCooldown_check(userID, cooldownType) {
    let userData = await user_fetch(userID, "essential", true);

    let cooldown = userData.cooldowns.find(cooldown => cooldown.type === cooldownType) || 0;
    return dateTools.eta(cooldown.timestamp, true);
}

/** @param {cooldownTypes} cooldownType */
async function userCooldown_reset(userID, cooldownType) {
    let cooldown = dateTools.fromNow(userSettings.cooldowns[cooldownType] || 0);

    let cooldownExists = await models.user.exists({ _id: userID, "cooldowns.type": cooldownType });

    // Push the cooldown to the user in Mongo
    if (cooldownExists) await models.user.updateOne(
        { _id: userID, "cooldowns.type": cooldownType },
        { $set: { "cooldowns.$": { type: cooldownType, timestamp: cooldown } } }
    );
    else await models.user.updateOne(
        { _id: userID },
        { $addToSet: { "cooldowns": { type: cooldownType, timestamp: cooldown } } }
    );

    return null;
}

//! User -> Reminders
/** @param {cooldownTypes} reminderType */
async function userReminder_toggle(userID, reminderType) {
    let userData = await user_fetch(userID, "reminders");
    let reminder = userData.reminders.find(r => r.type === reminderType) || null;

    let enabled = true;

    // Toggle the user's reminder in Mongo
    if (reminder) {
        enabled = !reminder.enabled;

        await models.user.updateOne(
            { _id: userID, "reminders.type": reminderType },
            { $set: { "reminders.$": { type: reminderType, enabled } } }
        );
    }
    else await models.user.updateOne(
        { _id: userID },
        { $addToSet: { "reminders": { type: reminderType, enabled } } }
    );

    return enabled;
}

/** @param {cooldownTypes} reminderType */
async function userReminder_reset(userID, guildID, channelID, user, reminderType) {
    let userData = await user_fetch(userID, "essential", true);

    // Check if the user has reminders enabled before resetting
    if (userData.reminders.find(r => r.type === reminderType)?.enabled) await guildReminder_add(
        guildID, channelID, { id: user.id, name: user.username }, reminderType
    );

    return null;
}

//! User -> Quests
async function userQuest_cache(userID) {
    if (!questManager.exists()) return;
    if (!await user_exists(userID)) return;

    // Fetch the user's quest data
    let userData = await user_fetch(userID, "quest");

    // Determine if we skip caching
    if (userData?.quests_completed) {
        // Filter only the current quests from the user's quest_completed array
        let _currentOnly = userData.quests_completed.filter(quest => questManager.questIDs.includes(quest.id));

        if (_currentOnly.length === questManager.quests.length) {
            // Reset the user's quest_cache
            await user_update(userID, { quest_cache: [] });

            // Skip since the user completed the current quests
            return;
        };
    }

    // Fetch the user's full data so we can cache their quest progress
    userData = await user_fetch(userID, "full");

    // Return a callback function to cache the user's new data
    return async () => {
        // Fetch the user's full data
        let userData_new = await user_fetch(userID, "full");
        let quest_cache = { ...userData_new?.quest_cache } || {};

        // Get the user's selected (idol) card
        let card_idol = userParser.cards.getIdol(userData_new);
        // Get the user's team
        let card_team = userParser.cards.getTeam(userData_new, false);

        // Set the gained difference between the last userData to cache progress
        quest_cache.balance ||= 0; quest_cache.balance += numberTools.clampPositive(
            userData_new.balance - userData.balance
        );
        quest_cache.ribbons ||= 0; quest_cache.ribbons += numberTools.clampPositive(
            userData_new?.ribbons - userData?.ribbons
        );
        quest_cache.inventory_count ||= 0; quest_cache.inventory_count += numberTools.clampPositive(
            userData_new.card_inventory.length - userData.card_inventory.length
        );

        // Set the constant values to cache progress
        quest_cache.level_user ||= 0; quest_cache.level_user = userData_new.level;
        quest_cache.level_idol ||= 0; quest_cache.level_idol = card_idol?.stats?.level
        quest_cache.team_ability ||= 0; quest_cache.team_ability = card_team?.ability_total;
        quest_cache.team_reputation ||= 0; quest_cache.team_reputation = card_team?.reputation_total;

        // Replace userData_new's quest_cache so we can validate quest requirements before updating in Mongo
        userData_new.quest_cache = quest_cache;

        // Validate the user's quest cache against the current quests
        let parsedQuestData = questManager.validate(userData_new);

        // Update the user's quest_cache
        await Promise.all([
            // Update the user's quests_completed cache
            (async () => {
                // Add completed quests if available
                if (parsedQuestData.completed.length) return await user_update(userID, {
                    $push: { "quests_completed": parsedQuestData.completed }
                });
            })(),

            // Update the user's quest_cache and apply quest rewards
            user_update(userID, {
                $set: {
                    // Update the user's quest_cache
                    "quest_cache.balance": quest_cache.balance,
                    "quest_cache.ribbons": quest_cache.ribbons,
                    "quest_cache.inventory_count": quest_cache.inventory_count,
                    "quest_cache.level_user": quest_cache.level_user,
                    "quest_cache.level_idol": quest_cache.level_idol,
                    "quest_cache.team_ability": quest_cache.team_ability,
                    "quest_cache.team_reputation": quest_cache.team_reputation,

                    // Update cached quest_requirements
                    "quest_cache.quest_requirements": parsedQuestData.requirements
                },
                $inc: {
                    // Apply some rewards
                    xp: parsedQuestData.rewards.xp,
                    balance: parsedQuestData.rewards.carrots,
                    ribbons: parsedQuestData.rewards.ribbons
                }
            }),
            // Reward the user with cards if available
            userCard_add(userID, parsedQuestData.rewards.cards)
        ]);

        return parsedQuestData;
    };
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

    guildManager: {
        exists: guild_exists,
        fetch: guild_fetch,
        fetchAll: guild_fetchAll,
        update: guild_update,

        reminders: {
            add: guildReminder_add,
            remove: guildReminder_remove
        }
    },

    userManager: {
        exists: user_exists,
        count: user_count,
        fetch: user_fetch,
        update: user_update,
        new: user_new,

        xp: {
            add: userXP_add,
            tryLevelUp: userXP_tryLevelUp
        },

        cards: {
            add: userCard_add,
            remove: userCard_remove,
            update: userCard_update,
            sell: userCard_sell
        },

        badges: {
            add: userBadge_addBadge,
            remove: userBadge_removeBadge
        },

        cooldowns: {
            check: userCooldown_check,
            reset: userCooldown_reset
        },

        reminders: {
            toggle: userReminder_toggle,
            reset: userReminder_reset
        },

        quests: {
            cache: userQuest_cache
        }
    }
};