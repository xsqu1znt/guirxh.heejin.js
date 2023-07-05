/** @typedef ObjectiveTypes
 * @type {"balance"|"ribbons"|"cards_in_inventory"|"level_user"|"level_idol"|"team_ability_reputation"|"card_global_ids"|"card_sets_complete"|"card_duplicates"}
*/

const { userManager } = require('../mongo');
const cardManager = require('../cardManager');
const userParser = require('../userParser');

const quests = require('../../items/quests.json');
const quest_ids = quests.map(quest => quest.id);

// Models
const { model: questCacheModel } = require('../../models/questCacheModel');
const models = { questCache: questCacheModel };

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

            case "level_user": objectives.level_user = (quest.objectives?.level_user <= questCache.level_user); break;
            case "level_idol": objectives.level_idol = (quest.objectives?.level_idol <= questCache.level_idol); break;

            case "team_ability_reputation": objectives.team_ability_reputation = (quest.objectives?.team_ability_reputation <= (questCache.team_ability && questCache.team_reputation)); break;

            case "card_global_ids": objectives.card_global_ids = userParser.cards.has(userData, quest.objectives.card_global_ids); break;
            case "card_sets_complete": objectives.card_sets_complete = userParser.cards.setsCompleted(userData, quest.objectives.card_sets_complete); break;
            case "card_duplicates": objectives.card_duplicates = (quest.objectives.card_duplicates.map(d =>
                userParser.cards.hasDuplicates(userData, d.globalID, d.count)
            ).filter(b => b).length === quest.objectives.card_duplicates.length); break;
        }

    // Get the size of the objectives object
    let objectives_size = Object.keys(objectives).length;

    // Create an array of completed/required quest objective types
    let objectives_complete = Object.entries(objectives).filter(obj => obj[1]).map(obj => obj[0]);
    let objectives_required = Object.entries(objectives).filter(obj => !obj[1]).map(obj => obj[0]);

    return {
        questID, quest,

        complete: objectives_complete.length === objectives_size,
        f: `${objectives_complete.length}/${objectives_size}`,

        objectives, objectives_complete, objectives_required,
        objectives_just_complete: progress_current
            ? objectives_complete
                // Filter out objectives the user already had marked as complete
                .filter(obj => !progress_current.objectives_complete.includes(obj))
                // Only return an array of objective types (string)
                .map(obj => obj)
            : [],
    };
}

/** @param {ObjectiveTypes} objectiveType */
function quest_toString_objective(objectiveType) {
    switch (objectiveType) {
        case "balance": return `🥕 Balance`;
        case "ribbons": return `🎀 Ribbons`;
        case "cards_in_inventory": return `🃏 Inventory`;
        case "level_user": return `📈 User LV.`;
        case "level_idol": return `📈 Idol LV.`;
        case "team_ability_reputation": return `👯‍♀️ ABI REP`;
        case "card_global_ids": return `🃏 GID`;
        case "card_sets_complete": return `🗣️ Set`;
        case "card_duplicates": return `🃏 Dupes`;

        default: return "invalid objective type";
    }
}

/** @param {ObjectiveTypes} objectiveType */
function quest_toString_objectiveDescription(questID, objectiveType) {
    let quest = quest_get(questID); if (!quest) return "invalid quest id";

    switch (objectiveType) {
        case "balance": return `\`🥕 Balance\` - \`get ${quest.objectives?.balance || "n/a"} new ${quest.objectives?.balance === 1 ? "carrot" : "carrots"}\``;
        case "ribbons": return `\`🎀 Ribbons\` - \`get ${quest.objectives?.ribbons || "n/a"} new ${quest.objectives?.ribbons === 1 ? "ribbon" : "ribbons"}\``;
        case "cards_in_inventory": return `\`🃏 Inventory\` - \`drop ${quest.objectives?.cards_in_inventory || "n/a"} new ${quest.objectives?.cards_in_inventory === 1 ? "card" : "cards"}\``;
        case "level_user": return `\`📈 User LV.\` - \`reach LV. ${quest.objectives?.level_user || "n/a"}\``;
        case "level_idol": return `\`📈 Idol LV.\` - \`reach LV. ${quest.objectives?.level_idol || "n/a"}\``;
        case "team_ability_reputation": return `\`👯‍♀️ ABI REP\` - \`reach ${quest.objectives?.team_ability_reputation || "n/a"} in ABI. REP. stats\``;
        case "card_global_ids": return `\`🃏 GID\` - \`own ${quest.objectives?.card_global_ids?.length === 1 ? "a card" : "cards"} with ${quest.objectives?.card_global_ids?.map(gid => `gid ${gid}`).join(", ")}\``;
        case "card_sets_complete": return `\`🗣️ Set\` - \`complete ${quest.objectives?.card_sets_complete?.length === 1 ? "set" : "sets"} ${quest.objectives?.card_sets_complete?.join(", ")}\``;
        case "card_duplicates": return `\`🃏 Dupes\` - \`own ${quest.objectives?.card_duplicates?.map(d => `${d.count} dupes of gid ${d.globalID}`).join(", ")}\``;

        default: return "invalid objective type";
    }
}

//! User parsing (Mongo)
async function mongo_user_isQuestComplete(userID, questID) {
    if (!Array.isArray(questID)) questID = [questID];

    // Fetch the user from Mongo
    let userData = await userManager.fetch(userID, "quest");

    // Add the new quests_complete property to the user in Mongo
    if (!userData?.quests_complete) await userManager.update(userID, { quests_complete: [] });

    // Filter quests based on the given quest ID
    let quests_filtered = userData?.quests_complete?.filter(quest => questID.includes(quest.id));
    return quests_filtered?.length === questID.length ? true : false;
}

async function mongo_user_markQuestComplete(userID, questID) {
    let quest = quests.find(q => q.id === questID); if (!quest) return false;

    // Get the rewarded cards, if available
    let cards_reward = quest.rewards?.card_global_ids?.map(globalID => cardManager.get.byGlobalID(globalID)) || [];
    // Fillter out nulls
    cards_reward = cards_reward.filter(card => card);

    // Replace the original card_global_ids array with the cards
    if (cards_reward.length) quest.rewards.card_global_ids = cards_reward;

    try {
        // Push the update and rewards to Mongo
        await Promise.all([
            userManager.update(userID, {
                // Push a basic version of the quest currently complete
                $push: {
                    quests_complete: {
                        id: quest.id, name: quest.name, description: quest.description,
                        date: { start: quest.date.start, end: quest.date.end, completed: Date.now() }
                    }
                },
                // Increment carrots/ribbons
                $inc: {
                    xp: quest.rewards?.xp || 0,
                    carrots: quest.rewards?.carrots || 0,
                    ribbons: quest.rewards?.ribbons || 0
                }
            }),
            // Add the rewarded cards to the user's card_inventory
            userManager.cards.add(userID, cards_reward)
        ]);

        return true;
    } catch (err) { console.error(err); return false; }
}

//! QuestCache parsing (Mongo)
async function mongo_questCache_exists(userID) {
    let res = await models.questCache.exists({ _id: userID });
    return res ? true : false;
}

async function mongo_questCache_new(userID) {
    return await (new models.questCache({ _id: userID })).save();
}

async function mongo_questCache_fetch(userID, upsert = false) {
    let questCache = await models.questCache.findById(userID, null, { lean: true });
    if (upsert) questCache ||= mongo_questCache_new(userID);

    return questCache;
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
    if (await mongo_user_isQuestComplete(userID, quest_ids)) {
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
    let clampPos = (num) => num < 0 ? 0 : num;
    questCache = await mongo_questCache_update(userID, {
        // Increment values based on cache difference
        $inc: {
            balance: questCache.temp?.balance || questCache.temp?.balance === 0
                ? clampPos(userData.balance - questCache.temp.balance) : 0,

            ribbons: questCache.temp?.ribbons || questCache.temp?.ribbons === 0
                ? clampPos(userData.ribbons - questCache.temp.ribbons) : 0,

            cards_in_inventory: questCache.temp?.cards_in_inventory || questCache.temp?.cards_in_inventory === 0
                ? clampPos(userData.card_inventory.length - questCache.temp.cards_in_inventory) : 0
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
    questCache = await mongo_questCache_update(userID, { progress: questProgress });

    // Return cache, progress, and completed quests
    return {
        cache: questCache, progress: questProgress,
        quests_complete: questProgress.filter(progress => progress.complete).map(progress => progress.quest)
    };
}

module.exports = {
    quests, quest_ids,

    /// Quest Parsing Funtions
    get: quest_get,
    getProgress: quest_getProgress,

    toString: {
        objective: quest_toString_objective,
        objectiveDescription: quest_toString_objectiveDescription
    },

    /// Mongo Parsing Functions
    user: {
        isComplete: mongo_user_isQuestComplete,
        markComplete: mongo_user_markQuestComplete
    },

    cache: {
        exists: mongo_questCache_exists,
        new: mongo_questCache_new,
        fetch: mongo_questCache_fetch,
        update: mongo_questCache_update,
        updateCache: mongo_questCache_updateCache,
        reset: mongo_questCache_reset
    }
};