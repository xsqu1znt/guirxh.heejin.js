/** @typedef {"balance"|"ribbons"|"cards_in_inventory"|"level_user"|"level_idol"|"team_ability_reputation"|"card_global_ids"|"card_sets_complete"|"card_duplicates"} ObjectiveType */

const { markdown } = require("../discordTools/_dsT");
const cardManager = require("../cardManager");
// const userParser = require("../userParser");
// const userManager = require("./uM_index");

const quests = require("../../items/quests.json");

/** @param {string} id */
function get(id) {
	return quests.find(quest => quest.id === id) || null;
}

/// .toString
/** @param {ObjectiveType} objectiveType */
function toString_objective(objectiveType) {
	// prettier-ignore
	switch (objectiveType) {
		case "balance": return `🥕 Balance`;
		case "ribbons": return `🎀 Ribbons`;
		case "cards_in_inventory": return `🃏 Inventory`;
		case "level_user": return `📈 User LV.`;
		case "level_idol": return `📈 Idol LV.`;
		case "team_ability_reputation": return `👯‍♀️ ABI REP`;
		case "card_global_ids": return `🃏 GID`;
		case "card_sets_complete": return `🗣️ Set`;
		case "card_duplicates": return `🃏 Dupes`;

		default: return "invalid objective type";
	}
}

/** @param {string} id @param {ObjectiveType} objectiveType */
function toString_objectiveDetails(id, objectiveType) {
	let quest = get(id);
	if (!quest) return "invalid quest ID";

	// prettier-ignore
	switch (objectiveType) {
        case "balance": return quest.objectives?.balance
            ? `\`🥕 Balance\` - \`get ${quest.objectives.balance} new ${quest.objectives.balance === 1 ? "carrot" : "carrots"}\``
            : "n/a";

        case "ribbons": return quest.objectives?.ribbons
            ? `\`🎀 Ribbons\` - \`get ${quest.objectives.ribbons} new ${quest.objectives.ribbons === 1 ? "ribbon" : "ribbons"}\``
            : "n/a";

        case "cards_in_inventory": return quest.objectives?.cards_in_inventory
            ? `\`🃏 Inventory\` - \`drop ${quest.objectives.cards_in_inventory} new ${quest.objectives.cards_in_inventory === 1 ? "card" : "cards"}\``
            : "n/a";

        case "level_user": return quest.objectives?.level_user
            ? `\`📈 User LV.\` - \`reach LV. ${quest.objectives.level_user}\``
            : "n/a";

        case "level_idol": return quest.objectives?.level_idol
            ? `\`📈 Idol LV.\` - \`reach LV. ${quest.objectives.level_idol}\``
            : "n/a";

        case "team_ability_reputation": return quest.objectives?.team_ability_reputation
            ? `\`👯‍♀️ ABI REP\` - \`reach ${quest.objectives.team_ability_reputation} in ABI. REP. stats\``
            : "n/a";

        case "card_global_ids": return quest.objectives?.card_global_ids
            ? `\`🃏 GID\` - \`own ${quest.objectives.card_global_ids.length === 1 ? "a card" : "cards"} with ${quest.objectives.card_global_ids.map(gid => {
                let card = cardManager.get.globalID(gid);

                return `gid ${markdown.link(gid, card.imageURL, card.description)}`;
            }).join(", ")}\``
            : "n/a";

        case "card_sets_complete": return quest.objectives?.card_sets_complete
            ? `\`🗣️ Set\` - \`complete ${quest.objectives.card_sets_complete.length === 1 ? "set" : "sets"} ${quest.objectives.card_sets_complete.join(", ")}\``
            : "n/a";

        case "card_duplicates": return quest.objectives?.card_duplicates
            ? `\`🃏 Dupes\` - \`own ${quest.objectives.card_duplicates.map(d => {
                let card = cardManager.get.globalID(d.globalID);

                return `${d.count} ${d.count === 1 ? "dupe" : "dupes"} of ${markdown.link(d.globalID, card.imageURL, card.description)}`;
            }).join(", ")}\``
            : "n/a";

        default: return "invalid objective type";
    }
}

module.exports = {
	quests
};
