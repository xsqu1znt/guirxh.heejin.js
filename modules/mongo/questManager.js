const { TimestampStyles, time, SystemChannelFlagsBitField } = require('discord.js');

const { botSettings: { currencyIcon } } = require('../../configs/heejinSettings.json');

const { model: questCacheModel, QuestCache, QuestObjectiveProgress, QuestObjectiveTypes } = require('../../models/questCacheModel');

const { numberTools, dateTools } = require('../jsTools');
const { userManager } = require('../mongo');
const cardManager = require('../cardManager');
const userParser = require('../userParser');

const quests = require('../../configs/quests.json');
const quest_ids = quests.map(quest => quest.id);

const models = {
    questCache: questCacheModel
};

//! Quest parsing
function quest_get(questID) {
    return quests.find(quest => quest.id === questID) || null;
}

function quest_getProgress(questID, userData, questCache) {
    let quest = quest_get(questID); if (!quest) return null;

    let progress_current = questCache.progress.find(progress => progress.questID === questID);
    let objectives = {};

    // Iterate through quest objectives and test if the user completed them
    for (let obj of Object.keys(quest.objectives))
        switch (obj) {
            case "balance": objectives.balance = (quest.objectives?.balance <= questCache.balance); break;
            case "ribbons": objectives.ribbons = (quest.objectives?.ribbons <= questCache.ribbons); break;
            case "cards_in_inventory": objectives.cards_in_inventory = (quest.objectives?.cards_in_inventory <= questCache.cards_in_inventory); break;

            case "level_user": objectives.ribbons = (quest.objectives?.level_user <= questCache.level_user); break;
            case "level_idol": objectives.ribbons = (quest.objectives?.level_idol <= questCache.level_idol); break;

            case "team_ability": objectives.ribbons = (quest.objectives?.team_ability <= questCache.team_ability); break;
            case "team_reputation": objectives.ribbons = (quest.objectives?.team_reputation <= questCache.team_reputation); break;

            case "card_global_ids": objectives.card_global_ids = userParser.cards.has(userData, quest.objectives.card_global_ids); break;
            case "card_sets_complete": objectives.card_sets_complete = userParser.cards.setsCompleted(userData, quest.objectives.card_sets_completed); break;
            case "card_duplicates": objectives.card_duplicates = (quest.objectives.card_duplicates.map(globalID =>
                userParser.cards.hasDuplicates(userData, globalID)
            ).filter(b => b).length === quest.objectives.card_duplicates.length); break;
        }

    // Get the size of the objectives object
    let objectives_size = Object.keys(objectives).length;

    // Create an array of completed/required quest objectives
    let objectives_complete = Object.entries(objectives).filter(obj => obj[1]);
    let objectives_required = Object.entries(objectives).filter(obj => !obj[1]);

    return {
        questID, quest,

        complete: objectives_complete.length === objectives_size,
        f: `${objectives_complete.length}/${objectives_size}`,

        objectives, objectives_complete, objectives_required,
        objectives_just_completed: progress_current
            ? objectives_complete
                // Filter out objectives the user already had marked as complete
                .filter(obj => !Object.keys(progress_current.objectives).includes(obj[0]))
                // Only return an array of objective types (string)
                .map(obj => obj[0])
            : [],
    };
}

//! User parsing (Mongo)
async function mongo_user_completedQuest(userID, questID) {
    if (!Array.isArray(questID)) questID = [questID];

    // Fetch the user from Mongo
    let userData = await userManager.fetch(userID, "quest");

    // Filter quests based on the given quest ID
    let quests_filtered = userData.quests_complete.filter(quest => questID.includes(quest.id));
    return quests_filtered.length === questID.length ? true : false;
}

//! QuestCache parsing (Mongo)
async function mongo_questCache_exists(userID) {
    let res = await models.questCache.exists({ _id: userID });
    return res ? true : false;
}

async function mongo_questCache_fetch(userID, upsert = false) {
    return await models.questCache.findById(userID, null, { upsert, lean: true });
}

async function mongo_questCache_update(userID, update) {
    return await models.questCache.findByIdAndUpdate(userID, update, { new: true, lean: true });
}

async function mongo_questCache_reset(userID) {
    return await models.questCache.replaceOne({ _id: userID }, {});
}

async function mongo_questCache_updateCache(userID) {
    if (!quests.length) return; if (!await userManager.exists(userID)) return;

    // Check whether the user completed the active quests
    if (await mongo_user_completedQuest(userID, quest_ids)) {
        // Reset quest cache
        await mongo_questCache_reset(userID); return;
    }

    // Fetch the user from Mongo
    let userData = await userManager.fetch(userID, "full");
    // Fetch the quest cache from Mongo
    let questCache = await mongo_questCache_fetch(userID, true);

    // Determine which active quests the user hasn't complete yet
    let quests_inProgress = quests.filter(quest => !userData.quests_complete.map(q => q.questID).includes(quest.id));

    // Get the user's idol card, if available
    let card_idol = userParser.cards.getIdol(userData);

    // Get the user's team, if available
    let card_team = userParser.cards.getTeam(userData);

    // Push the update to Mongo
    questCache = await mongo_questCache_update(userID, {
        // Increment values based on cache difference
        $inc: {
            balance: questCache.temp?.balance ? (userData.balance - questCache.temp.balance) : 0,
            ribbons: questCache.temp?.ribbons ? (userData.ribbons - questCache.temp.ribbons) : 0,
            cards_in_inventory: questCache.temp?.cards_in_inventory
                ? (userData.card_inventory.length - questCache.temp.cards_in_inventory)
                : 0
        },

        // Cache constant values
        // TODO: set active_quest_ids
        $set: {
            level_user: userData.level,
            level_idol: card_idol?.stats?.level || 0,

            team_ability: card_team.ability_total,
            team_reputation: card_team.reputation_total,

            // Save the questID of each quest the user hasn't complete
            quests_in_progress: quests_inProgress.map(quest => quest.id),

            // Update temporary cache to be used next time mongo_cache() is called
            temp: {
                balance: userData.balance,
                ribbons: userData.ribbons,
                cards_in_inventory: userData.card_inventory.length
            }
        }
    });

    // Get the user's progress for each active quest
    let questProgress = quests_inProgress.map(({ id }) => quest_getProgress(id, userData, questCache));
    // Filter out null returns
    questProgress = questProgress.filter(progress => progress);

    // Cache the progress in Mongo
    questCache = await mongo_questCache_update(userID, { quests_in_progress: quests_inProgress, progress: questProgress });

    // Return cache, progress, and completed quests
    return {
        cache: questCache, progress: questProgress,
        quests_complete: questProgress.filter(progress => progress.complete).map(progress => progress.quest)
    };
}





/* function toString(userData) {
    return validate(userData).progress.map(questProgress => {
        // let date_start = numberTools.milliToSeconds(Date.parse(quest.date.start));
        let date_end = dateTools.eta(Date.parse(questProgress.data.date.end));

        return {
            title: `\`📜\` **${questProgress.data.name}** ${questProgress.data.rewards}`,
            description: `> \`%COMPLETED %PROGRESS\` ending %TIMESTAMP_END\n\n${questProgress.data.description}`
                .replace("%COMPLETED", questProgress.isComplete ? "✔️" : "🚫")
                .replace("%PROGRESS", questProgress.f)
                .replace("%TIMESTAMP_END", date_end)
        };
    });
} */

/** @param {"balance" | "ribbons" | "inventory_count" | "level_user" | "level_idol" | "card_global_ids" | "card_sets_completed" | "card_duplicates" | "team_ability" | "team_reputation"} requirement  */
/* function toString_requirement(questID, requirement) {
    let quest = quests.find(q => q.id === questID);
    if (!quest) return "quest not found";

    let str = "";

    switch (requirement) {
        case "balance": str = `\`${currencyIcon} ${quest.requirements.balance}\``; break;
        case "ribbons": str = `\`🎀 ${quest.requirements.ribbons}\``; break;
        case "inventory_count": str = `\`INV. ${quest.requirements.inventory_count}\``; break;
        case "level_user": str = `\`LV. ${quest.requirements.level_user}\``; break;
        case "level_idol": str = `\`🏃 LV. ${quest.requirements.level_idol}\``; break;
        case "card_global_ids": str = `\`🃏 Req. Cards ${quest.requirements.card_global_ids.join(", ")}\``; break;
        case "card_sets_completed": str = `\`🃏 Req. Sets ${quest.requirements.card_sets_completed.join(", ")}\``; break;
        case "card_duplicates": str = `\`🃏 Dupes ${quest.requirements.card_duplicates.map(d => d.globalID).join(", ")}\``; break;
        case "team_ability": str = `\`👯‍♀️ ${quest.requirements.team_ability}\``; break;
        case "team_reputation": str = `\`👯‍♀️ ${quest.requirements.team_reputation}\``; break;
        default: str = "N/A"; break;
    }

    return str;
} */

/* function validate(userData) {
    let parsedQuestData = {
        completed: [], progress: [], requirements: [],
        rewards: { xp: 0, carrots: 0, ribbons: 0, cards: [] }
    };

    for (let quest of quests) {
        let requirements = structuredClone(quest.requirements);

        /// Test the quest's requirements against the user's data
        // Balance
        if (requirements?.balance <= userData?.quest_cache?.balance)
            requirements.balance = true; else requirements.balance = false;
        // Ribbons
        if (requirements?.ribbons <= userData?.quest_cache?.ribbons)
            requirements.ribbons = true; else requirements.ribbons = false;

        // User level
        if (requirements?.level_user <= userData?.quest_cache?.level_user)
            requirements.level_user = true; else requirements.level_user = false;
        // Idol level
        if (requirements?.level_idol <= userData?.quest_cache?.level_idol)
            requirements.level_idol = true; else requirements.level_idol = false;

        // Number of cards in the user's card_inventory
        if (requirements?.inventory_count <= userData.card_inventory.length)
            requirements.inventory_count = true; else requirements.inventory_count = false;

        // User owns a specific card
        if (userParser.cards.has(userData, requirements?.card_global_ids))
            requirements.card_global_ids = true; else requirements.card_global_ids = false;

        // User completed a specific set
        if (userParser.cards.setsCompleted(userData, requirements?.card_sets_completed))
            requirements.card_sets_completed = true; else requirements.card_sets_completed = false;

        // User owns duplicates of a specific card
        if (requirements?.card_duplicates) {
            let _completed = requirements.card_duplicates.filter(card =>
                userParser.cards.getDuplicates(userData, card.globalID).duplicateCount
                >= card.count
            );

            if (_completed.length === requirements.card_duplicates.length)
                requirements.card_duplicates = true; else requirements.card_duplicates = false;
        } else requirements.card_duplicates = false;

        // Team ability
        if (requirements?.team_ability <= userData?.quest_cache?.team_ability)
            requirements.team_ability = true; else requirements.team_ability = false;
        // Team reputation
        if (requirements?.team_reputation <= userData?.quest_cache?.team_reputation)
            requirements.team_reputation = true; else requirements.team_reputation = false;

        // Delete requirement values not part of the quest
        Object.keys(requirements).forEach(key => {
            if (!quest.requirements[key]) delete requirements[key];
        });

        // Process the result
        let requirements_completed = Object.values(requirements).filter(req => req).length;
        let requirements_needed = Object.keys(quest.requirements).length;

        // Check if the user completed all requirements
        if (requirements_completed === requirements_needed) {
            // Add to the total rewards
            parsedQuestData.rewards.xp += quest.reward?.xp || 0;
            parsedQuestData.rewards.carrots += quest.reward?.carrots || 0;
            parsedQuestData.rewards.ribbons += quest.reward?.ribbons || 0;
            parsedQuestData.rewards.cards = [...parsedQuestData.rewards.cards, ...(quest.reward?.card_global_ids || [])];

            // Get the cards from their global ID
            parsedQuestData.rewards.cards = parsedQuestData.rewards.cards.map(globalID =>
                cardManager.get.byGlobalID(globalID)
            ).filter(card => card);

            // Push the simplified completed quest object
            parsedQuestData.completed.push({
                id: quest.id, name: quest.name, date: quest.date, rewards: quest.rewards
            });
        }

        let requirements_justCompleted = [];
        let _questReqs = userData?.quest_cache?.quest_requirements?.find(qr => qr.id === quest.id);
        if (_questReqs) {
            Object.entries(_questReqs.requirements).forEach(_req => {
                if (requirements[_req[0]] !== _req[1] && requirements[_req[0]] === true)
                    // Add the name of the requirement to the completed list
                    requirements_justCompleted.push(_req[0]);
            });
        }

        parsedQuestData.progress.push({
            id: quest.id, data: quest,
            requirementsCompleted: requirements_justCompleted,
            isComplete: (requirements_completed === requirements_needed),
            completed: requirements_completed, needed: requirements_needed,
            f: `${requirements_completed}/${requirements_needed}`
        });

        // Push the new parsed requirements object
        parsedQuestData.requirements.push({ id: quest.id, requirements });
    }

    return parsedQuestData;

    if (!userData) return null;

    // Iterate through each quest
    return quests.map(quest => {
        // Skip if the user already completed the quest
        // if (userData?.quests_completed?.find(q => q.id === quest.id)) continue;

        let requirementCount = Object.entries(quest.requirements).length;
        let completedCount = 0;

        /// Test the quest's requirements against the user's data
        // Balance
        if (quest.requirements?.balance <= userData?.quest_cache?.balance)
            completedCount++;
        // Ribbons
        if (quest.requirements?.ribbons <= userData?.quest_cache?.ribbons)
            completedCount++;

        // User level
        if (quest.requirements?.level_user <= userData?.quest_cache?.level_user)
            completedCount++;
        // Idol level
        if (quest.requirements?.level_idol <= userData?.quest_cache?.level_idol)
            completedCount++;

        // How many cards in user's card_inventory
        if (quest.requirements?.inventory_count <= userData?.card_inventory?.length)
            completedCount++;

        // Has all the required cards
        if (userParser.cards.has(userData, quest.requirements?.card_globalIDs))
            completedCount++;
        // Completed all the required card sets
        if (userParser.cards.setsCompleted(userData, quest.requirements?.card_sets_completed))
            completedCount++;
        // Has an amount of duplicates of the required cards
        if (quest.requirements?.card_duplicates) {
            let _completed = quest.requirements.card_duplicates.filter(card_required =>
                userParser.cards.getDuplicates(userData, card_required.globalID).duplicateCount
                >= card_required.count
            );

            if (_completed.length === quest.requirements.card_duplicates.length) completedCount++;
        }

        // Team ability
        if (quest.requirements?.team_ability <= userData?.quest_cache?.team_ability)
            completedCount++;
        // Team reputation
        if (quest.requirements?.team_reputation <= userData?.quest_cache?.team_reputation)
            completedCount++;

        // Add data to the quest object
        quest.progress_f = `${completedCount}/${requirementCount}`;
        quest.completed = (completedCount === requirementCount);

        return quest;
    });
} */

module.exports = {
    quests, quest_ids,

    /// Quest Parsing Funtions
    get: quest_get,
    getProgress: quest_getProgress,

    /// Mongo Parsing Functions
    user: {
        completedQuest: mongo_user_completedQuest
    },

    cache: {
        exists: mongo_questCache_exists,
        fetch: mongo_questCache_fetch,
        update: mongo_questCache_update,
        updateCache: mongo_questCache_updateCache,
        reset: mongo_questCache_reset
    }
};