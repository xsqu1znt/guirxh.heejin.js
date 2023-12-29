/** @typedef {"balance"|"ribbons"|"daily_streak"|"level_user"|"level_idol"|"team_power"|"cards_new"|"cards_have_gids"|"cards_have_sets"|"cards_have_dupes"} ObjectiveType */

const fs = require("fs");

const { markdown, BetterEmbed } = require("../discordTools");
const cardManager = require("../cardManager");
const logger = require("../logger");
const jt = require("../jsTools");

const userManager = require("./uM_index");
const uM_inventory = require("./uM_inventory");
const uM_balance = require("./uM_balance");
const uM_levels = require("./uM_levels");
const uM_quests = require("./uM_quests");

const quests = require("../../configs/quests.json");
const quests_active = quests.filter(q => q.ending > Date.now());

const configs = { bot: require("../../configs/config_bot.json") };

/* - - - - - { Parse Quest Config Data } - - - - - */
function parseQuestConfig() {
	let edited = false;

	// Iterate through each quest
	for (let quest of quests) {
		// Parse quest end timestamp
		if (typeof quest.ending === "string") {
			quest.ending = jt.parseTime(quest.ending, { fromNow: true });
			edited = true;
		}
	}

	// Save the edited file
	if (edited) {
		// Convert into JSON
		let jsonData = JSON.stringify(quests, null, 4);

		// Write the file
		fs.writeFileSync("./configs/quests.json", jsonData);
		logger.debug("quests.json config file has been updated");
	}
}

parseQuestConfig();

/* - - - - - { Parsing / Database } - - - - - */
async function checkUserQuest(userID, questID) {
	let quest = quests.find(q => q.id === questID);
	if (!quest) return null;

	let _objectives = Object.entries(quest.objectives);
	let parsedObjectives = [];

	// Fetch the user from Mongo
	let userData = await userManager.fetch(userID, { type: "quest" });
	// Fetch the user's quest data from Mongo
	let userQuestData = await userManager.models.userQuestData.findById(userID);
	if (!userQuestData) return null;

	/* - - - - - { Validation Functions } - - - - - */
	const checkIntBasedObjective = (objective, userProperty) => {
		return { complete: objective <= userProperty, has: jt.clamp(userProperty, { max: objective }), outOf: objective };
	};

	const checkHasGIDs = async globalIDs => {
		let has = await uM_inventory.has(userID, { gids: globalIDs });
		return { complete: has.length === globalIDs.length, has, outOf: globalIDs.length };
	};

	const checkHasSets = async setIDs => {
		// Get the cards in the set
		let sets = setIDs.map(setID => cardManager.get.setID(setID));
		// Iterate through each set and check if the user has all the cards
		let has = await Promise.all(sets.map(gids => uM_inventory.has(userID, { gids, sum: true })));

		return { complete: has.filter(b => b).length === setIDs.length, has, outOf: setIDs.length };
	};

	const checkHasDupes = async requiredDupes => {
		// Iterate through each globalID and fetch the matching cards in the user's card_inventory
		let userCards = await Promise.all(requiredDupes.map(data => uM_inventory.get(userID, { gids: data.globalID })));
		let has = [];

		// Iterate through the fetched cards and check if the user has the required dupes
		for (let i = 0; i < userCards.length; i++) {
			let _cards = userCards[i];
			let _dupeData = requiredDupes[i];

			// prettier-ignore
			if (!_cards || !_cards?.length) { has.push(false); continue; }
			// prettier-ignore
			// we're subtracting 1 here because the main (non-dupe) card doesn't count
			if ((_cards.length - 1) >= _dupeData.count) { has.push(true); continue; }

			// Fail-safe
			has.push(false);
		}

		return { complete: has.filter(b => b).length === requiredDupes.length, has, outOf: requiredDupes.length };
	};

	// prettier-ignore
	// Iterate through each objective and check if they are done
	await Promise.all(_objectives.map(async ([objectiveKey, objectiveValue]) => {
		switch (objectiveKey) {
			// ObjectiveType :: { BALANCE }
			case "balance": parsedObjectives.push({ type: "balance", ...checkIntBasedObjective(objectiveValue, userQuestData.balance) }); break;
	
			// ObjectiveType :: { RIBBONS }
			case "ribbons": parsedObjectives.push({ type: "ribbons", ...checkIntBasedObjective(objectiveValue, userQuestData.ribbons) }); break;

			// ObjectiveType :: { DAILY STREAK }
			case "daily_streak": parsedObjectives.push({ type: "daily_streak", ...checkIntBasedObjective(objectiveValue, userData.daily_streak) }); break;

			// ObjectiveType :: { USER XP }
			case "xp_user": parsedObjectives.push({ type: "xp_user", ...checkIntBasedObjective(objectiveValue, userQuestData.xp_user) }); break;

			// ObjectiveType :: { IDOL XP }
			case "xp_idol": parsedObjectives.push({ type: "xp_idol", ...checkIntBasedObjective(objectiveValue, userQuestData.xp_idol) }); break;

			// ObjectiveType :: { USER LVL }
			case "level_user": parsedObjectives.push({ type: "level_user", ...checkIntBasedObjective(objectiveValue, userQuestData.level_user) }); break;
	
			// ObjectiveType :: { IDOL LVL }
			case "level_idol": parsedObjectives.push({ type: "level_idol", ...checkIntBasedObjective(objectiveValue, userQuestData.level_idol) }); break;
	
			// ObjectiveType :: { TEAM POWER }
			case "team_power": parsedObjectives.push({ type: "team_power", ...checkIntBasedObjective(objectiveValue, userQuestData.team_power) }); break;
	
			// ObjectiveType :: { CARDS NEW }
			case "cards_new": parsedObjectives.push({ type: "cards_new", ...checkIntBasedObjective(objectiveValue, userQuestData.cards_new) }); break;
	
			// ObjectiveType :: { CARDS have GIDS }
			case "cards_have_gids": parsedObjectives.push({ type: "cards_have_gids", ...(await checkHasGIDs(objectiveValue)) }); break;
	
			// ObjectiveType :: { CARDS have SETS }
			case "cards_have_sets": parsedObjectives.push({ type: "cards_have_sets", ...(await checkHasSets(objectiveValue)) }); break;
	
			// ObjectiveType :: { CARDS have DUPES }
			case "cards_have_dupes": parsedObjectives.push({ type: "cards_have_dupes", ...(await checkHasDupes(objectiveValue)) }); break;
		}
	}));

	return {
		quest_id: questID,
		quest_complete: Object.values(parsedObjectives).filter(o => o.complete).length === _objectives.length,
		objectives: parsedObjectives
	};
}

async function completeQuest(user, questID) {
	let quest = quests_active.find(q => q.id === questID);
	if (!quest) return;

	// Update the user's completed quests in the Mongo
	uM_quests.update(user.id, { $push: { completed: questID } });

	// prettier-ignore
	// Give the user rewards
	if (quest?.rewards) await Promise.all(Object.entries(quest.rewards).map(([rewardType, value]) => {
		// Determine reward type
		switch (rewardType) {
			case "xp":
				uM_levels.increment.xp(user.id, value, "quest");
				break;

			case "carrots":
				uM_balance.increment(user.id, value, "balance", "quest");
				break;

			case "ribbons":
				uM_balance.increment(user.id, value, "ribbons", "quest");
				break;
		}
	}));

	/* - - - - - { DM the User } - - - - - */
	let embed_questComplete = new BetterEmbed({
		author: `\`📜\` Good job! You completed '${quest.name}'`,
		description: `**You were rewarded with**: \`${toString_rewards(quest.rewards)}\`!`,
		timestamp: true
	});

	// Send the embed to the user
	await user.send({ embeds: [embed_questComplete] }).catch(() => null);
}

async function updateQuestProgress(user) {
	if (!quests_active.length) return;

	// Fetch the user's quest data
	let userQuestData = await userManager.models.userQuestData.findById(user.id);
	if (!userQuestData) return;

	// Filter out quests the user already completed
	let _quests = quests_active.filter(q => !userQuestData.completed.includes(q.id));
	if (!_quests.length) return;

	// Get the user's quest progress
	let questProgress = await Promise.all(_quests.map(q => checkUserQuest(user.id, q.id)));
	let newObjectivesComplete = [];

	// Iterate through quest progress
	for (let progress of questProgress) {
		let _objectivesComplete = [];

		// Iterate through quest objectives
		for (let objective of progress.objectives) {
			// Ignore objectives that aren't complete
			if (!objective.complete) continue;

			if (userQuestData.completed_objective_cache.find(o => o.quest_id === progress.quest_id && o.type === objective.type))
				continue;

			// Push the objective to the array so we can let the user know they completed a quest objective
			_objectivesComplete.push(objective.type);

			// Add to the objective cache in Mongo
			/* uM_quests.update(user.id, {
				$push: { completed_objective_cache: { quest_id: progress.quest_id, type: objective.type } }
			}); */
		}

		// Push the completed objectives to the main array
		if (_objectivesComplete.length)
			newObjectivesComplete.push({ quest_id: progress.quest_id, objectives: _objectivesComplete });
	}

	let questsCompleted = questProgress.filter(p => p.quest_complete);

	// Call the completeQuest function on completed quests
	for (let quest of questsCompleted) completeQuest(user, quest.quest_id);

	return {
		progress: questProgress,
		questsComplete: questsCompleted.map(q => q.quest_id),
		newObjectivesComplete: newObjectivesComplete || []
	};
}

/* - - - - - { File System } - - - - - */
function getActive(questID) {
	return quests_active.find(q => q.id === questID) || null;
}

/* - - - - - { toString } - - - - - */
function toString_rewards(rewards) {
	let rewards_f = [];

	if (rewards?.xp) rewards_f.push(`☝️ ${rewards.xp}xp`);
	if (rewards?.carrots) rewards_f.push(`${configs.bot.emojis.currency_1.EMOJI} ${rewards.carrots}`);
	if (rewards?.ribbons) rewards_f.push(`${configs.bot.emojis.currency_2.EMOJI} ${rewards.ribbons}`);

	return rewards_f.join(" ");
}

/** @param {ObjectiveType} objectiveType */
function toString_objective(objectiveType) {
	// prettier-ignore
	switch (objectiveType) {
		case "balance": return "🥕 Balance";
		case "ribbons": return "🎀 Ribbons";
		case "daily_streak": return "📆 Daily Streak";
		case "xp_user": return "👆 User XP";
		case "xp_idol": return "👆 Idol XP";
		case "level_user": return "📈 User LV.";
		case "level_idol": return "📈 Idol LV.";
		case "team_power": return "👯‍♀️ ABI REP";
		case "cards_new": return "🃏 Inventory";
		case "cards_have_gids": return "🃏 GID";
		case "cards_have_sets": return "🗣️ Set";
		case "cards_have_dupes": return "🃏 Dupes";

		default: return "invalid objective type";
	}
}

/** @param {string} id @param {ObjectiveType} objectiveType */
function toString_objectiveDetails(quest, objectiveType) {
	// prettier-ignore
	switch (objectiveType) {
        case "balance": return quest.objectives?.balance
            ? `\`🥕 Balance\` get \`${quest.objectives.balance}\` new ${quest.objectives.balance === 1 ? "carrot" : "carrots"}`
            : "n/a";

        case "ribbons": return quest.objectives?.ribbons
            ? `\`🎀 Ribbons\` get \`${quest.objectives.ribbons}\` new ${quest.objectives.ribbons === 1 ? "ribbon" : "ribbons"}`
            : "n/a";

        case "daily_streak": return quest.objectives?.daily_streak
            ? `\`📆 Daily Streak\` reach a \`${quest.objectives.daily_streak}\` streak`
			: "n/a";

		case "xp_user": return quest.objectives?.xp_user
            ? `\`👆 User XP\` get \`${quest.objectives.xp_user}\` XP`
            : "n/a";

        case "xp_idol": return quest.objectives?.xp_idol
            ? `\`👆 Idol XP\` get \`${quest.objectives.xp_idol}\` XP for your idol`
            : "n/a";

        case "level_user": return quest.objectives?.level_user
            ? `\`📈 User LV.\` reach \`LV. ${quest.objectives.level_user}\``
            : "n/a";

        case "level_idol": return quest.objectives?.level_idol
            ? `\`📈 Idol LV.\` reach \`LV. ${quest.objectives.level_idol}\``
            : "n/a";

        case "team_power": return quest.objectives?.team_power
            ? `\`👯‍♀️ ABI REP\` reach \`${quest.objectives.team_power}\` in ABI. REP. stats`
			: "n/a";
		
		case "cards_new": return quest.objectives?.cards_new
            ? `\`🃏 Inventory\` drop \`${quest.objectives.cards_new}\` new ${quest.objectives.cards_new === 1 ? "card" : "cards"}`
            : "n/a";

        case "cards_have_gids": return quest.objectives?.cards_have_gids
            ? `\`🃏 GID\` own ${quest.objectives.cards_have_gids.length === 1 ? "a card" : "cards"} with ${quest.objectives.cards_have_gids.map(gid => {
                let card = cardManager.get.globalID(gid);
                if (!card) return "invalid global ID";

                return `gid ${markdown.link(gid, card.imageURL, `${card.single} - ${card.name}`)}`;
            }).join(", ")}`
            : "n/a";

        case "cards_have_sets": return quest.objectives?.cards_have_sets
            ? `\`🗣️ Set\` complete ${quest.objectives.cards_have_sets.length === 1 ? "set" : "sets"}:\n${quest.objectives.cards_have_sets.map(str => ` - \`🚫 ${str}\``).join("\n")}`
            : "n/a";

        case "cards_have_dupes": return quest.objectives?.cards_have_dupes
            ? `\`🃏 Dupes\` owned:\n${quest.objectives.cards_have_dupes.map(d => {
                let card = cardManager.get.globalID(d.globalID);
                if (!card) return "invalid global ID";

                return ` - \`🚫 ${d.count} ${d.count === 1 ? "dupe" : "dupes"}\` of ${markdown.link(d.globalID, card.imageURL, `${card.single} - ${card.name}`)}`;
            }).join("\n")}`
            : "n/a";

        default: return "invalid objective type";
    }
}

module.exports = {
	quests,
	quests_active,

	checkUserQuest,
	updateQuestProgress,

	getActive,

	toString: {
		rewards: toString_rewards,
		objective: toString_objective,
		objectiveDetails: toString_objectiveDetails
	}
};
