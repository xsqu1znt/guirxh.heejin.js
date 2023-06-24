const { TimestampStyles, time } = require('discord.js');

const { botSettings: { currencyIcon } } = require('../configs/heejinSettings.json');
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

/** @param {"balance" | "ribbons" | "inventory_count" | "level_user" | "level_idol" | "card_global_ids" | "card_sets_completed" | "card_duplicates" | "team_ability" | "team_reputation"} requirement  */
function toString_requirement(questID, requirement) {
    let quest = quests.find(q => q.id === questID);
    if (!quest) return "quest not found";

    let str = "";

    switch (requirement) {
        case "balance": str = `\`${currencyIcon} ${quest.requirements.balance}\``; break;
        case "ribbons": str = `\`🎀 ${quest.requirements.ribbons}\``; break;
        case "inventory_count": str = `\`INV. ${quest.requirements.inventory_count}\``; break;
        case "level_user": str = `\`LVL. ${quest.requirements.level_user}\``; break;
        case "level_idol": str = `\`🏃 LVL. ${quest.requirements.level_idol}\``; break;
        case "card_global_ids": str = `\`🃏 Req. Cards ${quest.requirements.card_global_ids.join(", ")}\``; break;
        case "card_sets_completed": str = `\`🃏 Req. Sets ${quest.requirements.card_sets_completed.join(", ")}\``; break;
        case "card_duplicates": str = `\`🃏 Dupes ${quest.requirements.card_duplicates.map(d => d.globalID).join(", ")}\``; break;
        case "team_ability": str = `\`👯‍♀️ ${quest.requirements.team_ability}\``; break;
        case "team_reputation": str = `\`👯‍♀️ ${quest.requirements.team_reputation}\``; break;
        default: str = "N/A"; break;
    }

    return str;
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
    }); */
}

module.exports = {
    quests, questIDs: quests.map(q => q.id),
    exists,
    toString, toString_requirement,
    validate
};