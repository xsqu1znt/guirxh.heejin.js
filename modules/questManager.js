const { TimestampStyles, time } = require('discord.js');

const { botSettings: { currencyIcon } } = require('../configs/heejinSettings.json');
const { numberTools } = require('./jsTools');
const { userManager } = require('./mongo');
const quests = require('../configs/quests.json');

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

async function validate(client, userData) {
    /* let { quest_cache } = await userManager.fetch(userID, "quest");

    for (let quest of quests) {
        
    } */
}

module.exports = {
    exists,
    toString,
    validate
};