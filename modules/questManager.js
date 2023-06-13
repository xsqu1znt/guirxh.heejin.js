const { TimestampStyles, time } = require('discord.js');

const quests = require('../configs/quests.json');
const { botSettings: { currencyIcon } } = require('../configs/heejinSettings.json');
const { numberTools } = require('./jsTools');
const cardManager = require('./cardManager');
const userParser = require('./userParser');

function exists() {
    return quests.length > 0;
}

function toString() {
    let parsed = [];

    for (let quest of quests) {
        // let date_start = numberTools.milliToSeconds(Date.parse(quest.date.start));
        let date_end = numberTools.milliToSeconds(Date.parse(quest.date.end));

        let quest_title = `\`📜\` **${quest.name}** ${quest.reward}`;
        let quest_progress = `> *Progress* \`0/100\` :: ${time(date_end, TimestampStyles.RelativeTime)}`;
        let quest_description = `> ${quest.description}`;

        parsed.push({ title: quest_title, progress: quest_progress, description: quest_description });
    }

    return parsed;
}

function validate(userData) {
    if (!userData) return null;
    let completedQuests = [];

    // Iterate through each quest
    for (let quest of quests) {
        // Skip if the user already completed the quest
        if (userData?.quests_completed?.find(q => q.id === quest.id)) continue;

        let requirementCount = Object.entries(quest.requirements).length;
        let completedCount = 0;

        // Test the quest's requirements against the user's data
        if (quest.requirements?.balance <= userData.quest_cache.balance)
            completedCount++;
        if (quest.requirements?.ribbons <= userData.quest_cache.ribbons)
            completedCount++;

        if (quest.requirements?.inventory_total <= userData.card_inventory.length)
            completedCount++;

        if (userParser.cards.has(userData, quest.requirements?.card_gids))
            completedCount++;
        if (userParser.cards.setsCompleted(userData, quest.requirements?.sets_completed))
            completedCount++;
        if (quest.requirements?.duplicates) {
            let _completed = quest.require.duplicates.filter(gid => userParser.cards.getDuplicates(userData, gid).duplicateCount);

            if (_completed.length) completedCount++;
        }

        if (quest.requirements?.level_user <= userData.quest_cache.level_user)
            completedCount++;
        if (quest.requirements?.level_idol <= userData.quest_cache.level_idol)
            completedCount++;

        if (quest.requirements?.team_ability <= userData.quest_cache.team_ability)
            completedCount++;
        if (quest.requirements?.team_reputation <= userData.quest_cache.team_reputation)
            completedCount++;

        // Return the quest if it's determined that the user completed it
        if (completedCount === requirementCount) completedQuests.push(quest);
    }

    return completedQuests;
}

module.exports = {
    quests,
    exists,
    toString,
    validate
};