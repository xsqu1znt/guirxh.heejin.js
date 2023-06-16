const { TimestampStyles, time } = require('discord.js');

const quests = require('../configs/quests.json');
const { botSettings: { currencyIcon } } = require('../configs/heejinSettings.json');
const { numberTools } = require('./jsTools');
// const cardManager = require('./cardManager');
const userParser = require('./userParser');

function exists() {
    return quests.length > 0;
}

function toString(userData) {
    return validate(userData).map(quest => {
        // let date_start = numberTools.milliToSeconds(Date.parse(quest.date.start));
        let date_end = numberTools.milliToSeconds(Date.parse(quest.date.end));

        // > `emoji completed/incomplete` `0/100%` Ending in 14 days
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
    if (!userData) return null;

    // Iterate through each quest
    return quests.map(quest => {
        // Skip if the user already completed the quest
        // if (userData?.quests_completed?.find(q => q.id === quest.id)) continue;

        let requirementCount = Object.entries(quest.requirements).length;
        let completedCount = 0;

        /// Test the quest's requirements against the user's data
        // Balance
        if (quest.requirements?.balance <= userData.quest_cache.balance)
            completedCount++;
        // Ribbons
        if (quest.requirements?.ribbons <= userData.quest_cache.ribbons)
            completedCount++;

        // User level
        if (quest.requirements?.level_user <= userData.quest_cache.level_user)
            completedCount++;
        // Idol level
        if (quest.requirements?.level_idol <= userData.quest_cache.level_idol)
            completedCount++;

        // How many cards in user's card_inventory
        if (quest.requirements?.inventory_total <= userData.card_inventory.length)
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
        if (quest.requirements?.team_ability <= userData.quest_cache.team_ability)
            completedCount++;
        // Team reputation
        if (quest.requirements?.team_reputation <= userData.quest_cache.team_reputation)
            completedCount++;

        // Add data to the quest object
        quest.progress_f = `${completedCount}/${requirementCount}`;
        quest.completed = (completedCount === requirementCount);

        return quest;
    });
}

module.exports = {
    quests,
    exists,
    toString,
    validate
};