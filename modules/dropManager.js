/** @typedef {"general"|"weekly"|"season"|"event_1"|"event_2"|"card_pack"} DropType */

const { userManager } = require("./mongo/index");
const cardManager = require("./cardManager");
const _jsT = require("./jsTools/_jsT");

const config = {
	player: require("../configs/config_player.json"),
	event: require("../configs/config_event.json"),
	shop: require("../configs/config_shop.json"),
	drop: require("../configs/config_drop.json"),
	bot: require("../configs/config_bot.json")
};

/** @param {DropType} dropType @param {number} count  */
async function drop(userID, dropType, count) {
	let userData;
	let charm_dupeRepel = await userManager.charms.get(userID, "dupeRepel");
	// if (charm_dupeRepel) userData = await userManager.fetch(userID, { type: "inventory" });

	let cards = [];

	const drop_general = () => {
		let _category = _jsT.choiceWeighted(Object.values(config.drop.chance).map(c => ({ ...c, rarity: c.CHANCE })));
		let _cards = cardManager.cards.general.filter(card => card.rarity === _category.cardRarityFilter);

		return _jsT.choice(_cards, true);
	};

	switch (dropType) {
		// prettier-ignore
		case "general":
            for (let i = 0; i < count; i++) {
                
            }
            
            return;

		// prettier-ignore
		case "weekly": return;

		// prettier-ignore
		case "season": return;

		// prettier-ignore
		case "event_1": return;

		// prettier-ignore
		case "event_2": return;

		// prettier-ignore
		case "card_pack": return;
	}
}
