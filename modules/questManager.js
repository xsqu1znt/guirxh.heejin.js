const { TimestampStyles, time } = require('discord.js');

const { numberTools } = require('./jsTools');
const userParser = require('./userParser');

const quests = require('../configs/quests.json');

function exists() {
    return quests.length > 0;
}

function toString(userData) {
    return validate(userData).map(quest => {
        // let date_start = numberTools.milliToSeconds(Date.parse(quest.date.start));
        let date_end = numberTools.milliToSeconds(Date.parse(quest.date.end));

        return {
            title: `\`📜\` **${quest.name}** ${quest.rewards}`,
            description: `> \`%COMPLETED %PROGRESS\` ending %TIMESTAMP_END\n> ${quest.description}`
                .replace("%COMPLETED", quest.completed ? "✔️" : "🚫")
                .replace("%PROGRESS", quest.progress_f)
                .replace("%TIMESTAMP_END", time(date_end, TimestampStyles.RelativeTime))
        };
    });
}

function validate(userData) {
    let parsedQuestData = {
        completed: [],
        requirements: [],
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
            requirements.ribbons = true; else requirements.ribbons = false;
        // Idol level
        if (requirements?.level_idol <= userData?.quest_cache?.level_idol)
            requirements.level_idol = true; else requirements.level_idol = false;

        // Number of cards in the user's card_inventory
        if (requirements?.inventory_total <= userData.card_inventory.length)
            requirements.inventory_total = true; else requirements.inventory_total = false;

        // User owns a specific card
        if (requirements?.inventory_total <= userData.card_inventory.length)
            requirements.inventory_total = true; else requirements.inventory_total = false;
        // User completed a specific set
        if (requirements?.inventory_total <= userData.card_inventory.length)
            requirements.inventory_total = true; else requirements.inventory_total = false;
        // User owns duplicates of a specific card
        if (requirements?.inventory_total <= userData.card_inventory.length)
            requirements.inventory_total = true; else requirements.inventory_total = false;

        // Team ability
        if (requirements?.inventory_total <= userData.card_inventory.length)
            requirements.inventory_total = true; else requirements.inventory_total = false;
        // Team reputation
        if (requirements?.inventory_total <= userData.card_inventory.length)
            requirements.inventory_total = true; else requirements.inventory_total = false;
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