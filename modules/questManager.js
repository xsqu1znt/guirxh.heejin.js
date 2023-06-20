const { TimestampStyles, time } = require('discord.js');

const { numberTools } = require('./jsTools');
const cardManager = require('./cardManager');
const userParser = require('./userParser');

const quests = require('../configs/quests.json');

function exists() {
    return quests.length > 0;
}

function toString(userData) {
    return validate(userData).progress.map(questProgress => {
        // let date_start = numberTools.milliToSeconds(Date.parse(quest.date.start));
        let date_end = numberTools.milliToSeconds(Date.parse(questProgress.data.date.end));

        return {
            title: `\`📜\` **${questProgress.data.name}** ${questProgress.data.rewards}`,
            description: `>>> \`%COMPLETED %PROGRESS\` ending %TIMESTAMP_END\n${questProgress.data.description}`
                .replace("%COMPLETED", questProgress.isComplete ? "✔️" : "🚫")
                .replace("%PROGRESS", questProgress.f)
                .replace("%TIMESTAMP_END", time(date_end, TimestampStyles.RelativeTime))
        };
    });
}

function validate(userData) {
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
        if (requirements?.inventory_total <= userData.card_inventory.length)
            requirements.inventory_total = true; else requirements.inventory_total = false;

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

        // Delete requirements values not part of the quest
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

        parsedQuestData.progress.push({
            id: quest.id, data: quest,
            isComplete: (requirements_completed === requirements_needed),
            completed: requirements_completed, needed: requirements_needed,
            f: `${requirements_completed}/${requirements_needed}`
        });

        // Push the new parsed requirements object
        parsedQuestData.requirements.push({ id: quest.id, requirements });
    }

    return parsedQuestData;

    /* if (!userData) return null;

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
        if (quest.requirements?.inventory_total <= userData?.card_inventory?.length)
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
    }); */
}

module.exports = {
    quests, questIDs: quests.map(q => q.id),
    exists,
    toString,
    validate
};