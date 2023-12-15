/** @typedef {"balance"|"ribbons"|"cards_new"|"level_user"|"level_idol"|"team_power"|"card_global_ids"|"card_sets_complete"|"card_duplicates"} ObjectiveType */

const fs = require("fs");

const { markdown } = require("../discordTools");
const cardManager = require("../cardManager");
// const userParser = require("../userParser");
// const userManager = require("./uM_index");
const logger = require("../logger");
const jt = require("../jsTools");

const quests = require("../../configs/quests.json");
const quests_active = quests.filter(q => q.ending < Date.now());

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
/** @param {string} id */
function get(id) {
	return quests.find(quest => quest.id === id) || null;
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
		case "balance": return `🥕 Balance`;
		case "ribbons": return `🎀 Ribbons`;
		case "cards_new": return `🃏 Inventory`;
		case "level_user": return `📈 User LV.`;
		case "level_idol": return `📈 Idol LV.`;
		case "team_power": return `👯‍♀️ ABI REP`;
		case "card_global_ids": return `🃏 GID`;
		case "card_sets_complete": return `🗣️ Set`;
		case "card_duplicates": return `🃏 Dupes`;

		default: return "invalid objective type";
	}
}

/** @param {string} id @param {ObjectiveType} objectiveType */
function toString_objectiveDetails(quest, objectiveType) {
	// prettier-ignore
	switch (objectiveType) {
        case "balance": return quest.objectives?.balance
            ? `\`🥕 Balance\` get ${quest.objectives.balance} new ${quest.objectives.balance === 1 ? "carrot" : "carrots"}`
            : "n/a";

        case "ribbons": return quest.objectives?.ribbons
            ? `\`🎀 Ribbons\` get ${quest.objectives.ribbons} new ${quest.objectives.ribbons === 1 ? "ribbon" : "ribbons"}`
            : "n/a";

        case "cards_new": return quest.objectives?.cards_in_inventory
            ? `\`🃏 Inventory\` drop ${quest.objectives.cards_in_inventory} new ${quest.objectives.cards_new === 1 ? "card" : "cards"}`
            : "n/a";

        case "level_user": return quest.objectives?.level_user
            ? `\`📈 User LV.\` reach LV. ${quest.objectives.level_user}`
            : "n/a";

        case "level_idol": return quest.objectives?.level_idol
            ? `\`📈 Idol LV.\` reach LV. ${quest.objectives.level_idol}`
            : "n/a";

        case "team_power": return quest.objectives?.team_power
            ? `\`👯‍♀️ ABI REP\` reach ${quest.objectives.team_ability_reputation} in ABI. REP. stats`
            : "n/a";

        case "card_global_ids": return quest.objectives?.card_global_ids
            ? `\`🃏 GID\` own ${quest.objectives.card_global_ids.length === 1 ? "a card" : "cards"} with ${quest.objectives.card_global_ids.map(gid => {
                let card = cardManager.get.globalID(gid);
                if (!card) return "invalid global ID";

                return `gid ${markdown.link(gid, card.imageURL, `${card.single} - ${card.name}`)}`;
            }).join(", ")}`
            : "n/a";

        case "card_sets_complete": return quest.objectives?.card_sets_complete
            ? `\`🗣️ Set\` complete ${quest.objectives.card_sets_complete.length === 1 ? "set" : "sets"}:\n${quest.objectives.card_sets_complete.map(str => ` - \`🚫\` ${str}`).join("\n")}`
            : "n/a";

        case "card_duplicates": return quest.objectives?.card_duplicates
            ? `\`🃏 Dupes\` owned:\n${quest.objectives.card_duplicates.map(d => {
                let card = cardManager.get.globalID(d.globalID);
                if (!card) return "invalid global ID";

                return ` - \`🚫\` ${d.count} ${d.count === 1 ? "dupe" : "dupes"} of ${markdown.link(d.globalID, card.imageURL, `${card.single} - ${card.name}`)}`;
            }).join("\n")}`
            : "n/a";

        default: return "invalid objective type";
    }
}

module.exports = {
	quests,
	quests_active,

	toString: {
		rewards: toString_rewards,
		objective: toString_objective,
		objectiveDetails: toString_objectiveDetails
	}
};
