/** @typedef {"balance"|"ribbons"|"cards_in_inventory"|"level_user"|"level_idol"|"team_ability_reputation"|"card_global_ids"|"card_sets_complete"|"card_duplicates"} ObjectiveType */

// const cardManager = require("../cardManager");
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

    /* `\`🥕 Balance\` - \`get ${quest.objectives?.balance || "n/a"} new ${
        quest.objectives?.balance === 1 ? "carrot" : "carrots"
    }\``; */

    // prettier-ignore
    switch (objectiveType) {
        case "balance": return `\`🥕 Balance\` - \`get ${quest.objectives?.balance}\``; 

        case "ribbons": return "n/a";

        case "cards_in_inventory": return "n/a";

        case "level_user": return "n/a";

        case "level_idol": return "n/a";

        case "team_ability_reputation": return "n/a";

        case "card_global_ids": return "n/a";

        case "card_sets_complete": return "n/a";

        case "card_duplicates": return "n/a";

        default: return "invalid objective type";
    }
}

module.exports = {
    quests
}