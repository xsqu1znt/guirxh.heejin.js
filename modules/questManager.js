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

async function validate(userData) {
    if (!userData) return null;

    for (let quest of quests) {
        let requirementCount = Object.entries(quest.requirements).length;
        let completedCount = 0;

        completedCount += (quest.requirements?.balance <= userData.balance) ? 1 : 0;
        completedCount += (quest.requirements?.ribbons <= userData.ribbons) ? 1 : 0;

        completedCount += (quest.requirements?.inventory_total <= userData.card_inventory.length) ? 1 : 0;

        // TODO: userParser.cards.has(userID, globalIDs)
        completedCount += (userData.card_inventory.filter(card => quest.requirements?.card_gids.includes(card.globalID)).length >= quest.requirements?.card_gids.length) ? 1 : 0;

        completedCount += (quest.requirements?.sets_completed.filter(setID => userParser.cards.checkSetCompleted(userData, setID)).length >= quest.requirements?.sets_completed.length) ? 1 : 0;

        completedCount += (quest.requirements?.duplicates.filter(gid => userParser.cards.getDuplicates(userData, gid).duplicateCount >= quest.requirements?.duplicates.length)) ? 1 : 0;

        completedCount += (quest.requirements?.level_user <= userData.quest_cache.levels_user) ? 1 : 0;
        completedCount += (quest.requirements?.level_idol <= userData.quest_cache.levels_idol) ? 1 : 0;

        completedCount += (quest.requirements?.team_ability <= userData.quest_cache.team_ability) ? 1 : 0;
        completedCount += (quest.requirements?.team_reputation <= userData.quest_cache.team_reputation) ? 1 : 0;
    }
}

module.exports = {
    exists,
    toString,
    validate
};