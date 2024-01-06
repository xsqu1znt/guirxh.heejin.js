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

const quests = require("../../configs/quests.json");
let quests_active = quests.filter(q => q.ending > Date.now());

const configs = { bot: require("../../configs/config_bot.json") };

/* - - - - - { Parse Quest Config Data } - - - - - */
function updateActiveQuests() {
	quests_active = quests.filter(q => q.ending > Date.now());
}

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
		return { complete: has.filter(b => b).length === globalIDs.length, has, outOf: globalIDs.length };
	};

	const checkHasSets = async setIDs => {
		// Get the cards in the set
		let sets = setIDs.map(setID => cardManager.get.setID(setID));
		// Iterate through each set and check if the user has all the cards
		let has = await Promise.all(
			sets.map(set => uM_inventory.has(userID, { gids: set.map(c => c.globalID), sum: true }))
		);

		return { complete: has.filter(b => b).length === setIDs.length, has, outOf: setIDs.length };
	};

	const checkHasDupes = async requiredDupes => {
		// Iterate through each globalID and fetch the matching cards in the user's card_inventory
		let userCards = await Promise.all(
			requiredDupes.map(data => uM_inventory.getMultiple(userID, { gids: data.globalID }))
		);
		let has = [];

		// Iterate through the fetched cards and check if the user has the required dupes
		for (let i = 0; i < userCards.length; i++) {
			let _cards = userCards[i];
			let _dupeData = requiredDupes[i];

			// prettier-ignore
			if (!_cards?.length) { has.push(false); continue; }
			// prettier-ignore
			// we're subtracting 1 here because the main (non-dupe) card doesn't count
			if ((_cards.length - 1) >= _dupeData.count) { has.push(true); continue; }

			// Fail-safe
			has.push(false);
		}

		// console.log(userCards);

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
	userManager.models.userQuestData.findByIdAndUpdate(user.id, { $push: { completed: questID } });

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
		author: `📜 Good job! You completed '${quest.name}'`,
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

			// prettier-ignore
			if (userQuestData.completed_objective_cache.find(o => o.quest_id === progress.quest_id && o.type === objective.type))
				continue;

			// Push the objective to the array so we can let the user know they completed a quest objective
			_objectivesComplete.push(objective);

			// Add to the objective cache in Mongo
			userManager.models.userQuestData.findByIdAndUpdate(user.id, {
				$push: { completed_objective_cache: { quest_id: progress.quest_id, type: objective.type } }
			});
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

	if (rewards?.xp) rewards_f.push(`☝️ ${rewards.xp}XP`);
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

/** @param {string} id @param {ObjectiveType} objectiveType @param {ObjectiveProgress} objectiveProgress */
function toString_objectiveDetails(quest, objectiveType, objectiveProgress, questIsComplete = false) {
	let objectiveComplete = questIsComplete || objectiveProgress?.complete || false;
	let objectiveComplete_f = objectiveComplete ? "✔️" : "🚫";

	// prettier-ignore
	switch (objectiveType) {
		case "balance":
			if (!quest.objectives?.balance) return "n/a";

			return "- \`$COMPLETE\` \`🥕 Balance\` get \`$REQUIRED\` new $DYNAMIC :: \`[$PROGRESS]\`"
				.replace("$COMPLETE", objectiveComplete_f)
				.replace("$REQUIRED", quest.objectives.balance)
				.replace("$DYNAMIC", quest.objectives.balance === 1 ? "carrot" : "carrots")
				.replace("$PROGRESS", `${objectiveComplete ? quest.objectives.balance : objectiveProgress.has}/${quest.objectives.balance}`);

		case "ribbons":
			if (!quest.objectives?.ribbons) return "n/a";

			return "- \`$COMPLETE\` \`🎀 Ribbons\` get \`$REQUIRED\` new $DYNAMIC :: \`[$PROGRESS]\`"
				.replace("$COMPLETE", objectiveComplete_f)
				.replace("$REQUIRED", quest.objectives.ribbon)
				.replace("$DYNAMIC", quest.objectives.ribbon === 1 ? "ribbon" : "ribbons")
				.replace("$PROGRESS", `${objectiveComplete ? quest.objectives.ribbon : objectiveProgress.has}/${quest.objectives.ribbons}`);

		case "daily_streak":
			if (!quest.objectives?.daily_streak) return "n/a";

			return "- \`$COMPLETE\` \`📆 Daily Streak\` reach a \`$REQUIRED\` streak :: \`[$PROGRESS]\`"
				.replace("$COMPLETE", objectiveComplete_f)
				.replace("$REQUIRED", quest.objectives.daily_streak)
				.replace("$PROGRESS", `${objectiveComplete ? quest.objectives.daily_streak : objectiveProgress.has}/${quest.objectives.daily_streak}`);

		case "xp_user":
			if (!quest.objectives?.xp_user) return "n/a";

			return "- \`$COMPLETE\` \`👆 User XP\` get \`$REQUIRED\` user XP :: \`[$PROGRESS]\`"
				.replace("$COMPLETE", objectiveComplete_f)
				.replace("$REQUIRED", quest.objectives.xp_user)
				.replace("$PROGRESS", `${objectiveComplete ? quest.objectives.xp_user : objectiveProgress.has}/${quest.objectives.xp_user}`);

		case "xp_idol":
			if (!quest.objectives?.xp_idol) return "n/a";

			return "- \`$COMPLETE\` \`👆 Idol XP\` get \`$REQUIRED\` idol XP :: \`[$PROGRESS]\`"
				.replace("$COMPLETE", objectiveComplete_f)
				.replace("$REQUIRED", quest.objectives.xp_idol)
				.replace("$PROGRESS", `${objectiveComplete ? quest.objectives.xp_idol : objectiveProgress.has}/${quest.objectives.xp_idol}`);

		case "level_user":
			if (!quest.objectives?.level_user) return "n/a";

			return "- \`$COMPLETE\` \`📈 User LV.\` reach user level \`$REQUIRED\` :: \`[$PROGRESS]\`"
				.replace("$COMPLETE", objectiveComplete_f)
				.replace("$REQUIRED", quest.objectives.level_user)
				.replace("$PROGRESS", `${objectiveComplete ? quest.objectives.level_user : objectiveProgress.has}/${quest.objectives.level_user}`);

		case "level_idol":
			if (!quest.objectives?.level_idol) return "n/a";

			return "- \`$COMPLETE\` \`📈 Idol LV.\` reach idol level \`$REQUIRED\` :: \`[$PROGRESS]\`"
				.replace("$COMPLETE", objectiveComplete_f)
				.replace("$REQUIRED", quest.objectives.level_idol)
				.replace("$PROGRESS", `${objectiveComplete ? quest.objectives.level_idol : objectiveProgress.has}/${quest.objectives.level_idol}`);

		case "team_power":
			if (!quest.objectives?.team_power) return "n/a";

			return "- \`$COMPLETE\` \`👯‍♀️ ABI REP\` reach \`$REQUIRED\` in ABI. and REP. stats :: \`[$PROGRESS]\`"
				.replace("$COMPLETE", objectiveComplete_f)
				.replace("$REQUIRED", quest.objectives.team_power)
				.replace("$PROGRESS", `${objectiveComplete ? quest.objectives.team_power : objectiveProgress.has}/${quest.objectives.team_power}`);
		
		case "cards_new":
			if (!quest.objectives?.cards_new) return "n/a";

			return "- \`$COMPLETE\` \`🃏 Inventory\` drop \`$REQUIRED\` new $DYNAMIC :: \`[$PROGRESS]\`"
				.replace("$COMPLETE", objectiveComplete_f)
				.replace("$REQUIRED", quest.objectives.cards_new)
				.replace("$DYNAMIC", quest.objectives.cards_new === 1 ? "card" : "cards")
				.replace("$PROGRESS", `${objectiveComplete ? quest.objectives.cards_new : objectiveProgress.has}/${quest.objectives.cards_new}`);

		case "cards_have_gids":
			if (!quest.objectives?.cards_have_gids) return "n/a";

			let result_chg = "- \`$COMPLETE\` \`🃏 GID\` own \`$REQUIRED\` $DYNAMIC: $SINGLE_CARD\n$MULTI_CARD"
				.replace("$COMPLETE", objectiveComplete_f)
				.replace("$REQUIRED", quest.objectives.cards_have_gids.length)
				.replace("$DYNAMIC", quest.objectives.cards_have_gids.length === 1 ? "card" : "cards");
		
			// Dynamic format
			if (quest.objectives.cards_have_gids.length === 1)
				result_chg = result_chg.replace("\n$MULTI_CARD", "");
			else
				result_chg = result_chg.replace(" $SINGLE_CARD", "");

			// Continue building the format
			result_chg = result_chg
				.replace("$SINGLE_CARD", `\`${objectiveComplete || objectiveProgress.has[0] ? "✔️" : "🚫"}\` ${cardManager.toString.gidPeak(quest.objectives.cards_have_gids[0])}`)
				.replace("$MULTI_CARD", quest.objectives.cards_have_gids.map((gid, idx) => 
					` - \`${objectiveComplete || objectiveProgress.has[idx] ? "✔️" : "🚫"}\` ${cardManager.toString.gidPeak(gid)}`
				).join("\n"));

			return result_chg;

		case "cards_have_sets":
			if (!quest.objectives?.cards_have_sets) return "n/a";

			let result_chs = "- \`$COMPLETE\` \`🗣️ Set\` complete \`$REQUIRED\` $DYNAMIC: $SINGLE_CARD\n$MULTI_CARD"
				.replace("$COMPLETE", objectiveComplete_f)
				.replace("$REQUIRED", quest.objectives.cards_have_sets.length)
				.replace("$DYNAMIC", quest.objectives.cards_have_sets.length === 1 ? "set" : "sets");
		
			// Dynamic format
			if (quest.objectives.cards_have_sets.length === 1)
				result_chs = result_chs.replace("\n$MULTI_CARD", "");
			else
				result_chs = result_chs.replace(" $SINGLE_CARD", "");

			// Continue building the format
			result_chs = result_chs
				.replace("$SINGLE_CARD", `\`${objectiveComplete || objectiveProgress.has[0] ? "✔️" : "🚫"}\` ${quest.objectives.cards_have_sets[0]}`)
				.replace("$MULTI_CARD", quest.objectives.cards_have_sets.map((setID, idx) =>
					` - \`${objectiveComplete || objectiveProgress.has[idx] ? "✔️" : "🚫"}\` ${setID}`
				).join("\n"));

			return result_chs;

		case "cards_have_dupes":
			if (!quest.objectives?.cards_have_dupes) return "n/a";

			let result_chd = "- \`$COMPLETE\` \`🃏 Dupes\` own: $SINGLE_CARD\n$MULTI_CARD"
				.replace("$COMPLETE", objectiveComplete_f);
		
			// Dynamic format
			if (quest.objectives.cards_have_dupes.length === 1)
				result_chd = result_chd.replace("\n$MULTI_CARD", "");
			else
				result_chd = result_chd.replace(" $SINGLE_CARD", "");

			// Continue building the format
			result_chd = result_chd
				.replace(
					"$SINGLE_CARD",
					"\`$COMPLETE\` \`$DUPE_COUNT $DYNAMIC\` of $GID_PEAK"
						.replace("$COMPLETE", objectiveComplete || objectiveProgress.has[0] ? "✔️" : "🚫")
						.replace("$DUPE_COUNT", quest.objectives.cards_have_dupes[0].count)
						.replace("$DYNAMIC", quest.objectives.cards_have_dupes[0].count === 1 ? "dupe" : "dupes")
						.replace("$GID_PEAK", cardManager.toString.gidPeak(quest.objectives.cards_have_dupes[0].globalID))
				)
				.replace(
					"$MULTI_CARD",
					quest.objectives.cards_have_dupes.map((dupe, idx) => 
						" - \`$COMPLETE\` \`$DUPE_COUNT $DYNAMIC\` of $GID_PEAK"
							.replace("$COMPLETE", objectiveComplete || objectiveProgress.has[idx] ? "✔️" : "🚫")
							.replace("$DUPE_COUNT", dupe.count)
							.replace("$DYNAMIC", dupe.count === 1 ? "dupe" : "dupes")
							.replace("$GID_PEAK", cardManager.toString.gidPeak(dupe.globalID))
					).join("\n")
				);

			return result_chd;

        default: return "invalid objective type";
    }
}

module.exports = {
	quests,
	quests_active,

	updateActiveQuests,

	checkUserQuest,
	updateQuestProgress,

	getActive,

	toString: {
		rewards: toString_rewards,
		objective: toString_objective,
		objectiveDetails: toString_objectiveDetails
	}
};
