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
async function drop(userID, dropType) {
	let user_charms = {
		dupeRepel: await userManager.charms.get(userID, "dupeRepel")
	};

	let cards = [];

	const reroll = async cards => {
		// prettier-ignore
		// Check if the user already has the chosen cards
		let _isDupe = await userManager.inventory.has(userID, cards.map(c => c.card.globalID));

		// Calculate reroll chances
		let _reroll = _isDupe.map(d => (d ? _jsT.chance(user_charms.dupeRepel.power) : false));

		// Reroll if needed (checks if there's at least 1 true case)
		if (_reroll.filter(r => r).length)
			for (let i = 0; i < _reroll.length; i++)
				if (_reroll[i]) {
					// Check which cards the user has in the current category
					let _has = await userManager.inventory.has(userID, cards[i]._gID_pool);
					let _possible_gID_pool = cards[i]._gID_pool.filter(gid => !_has.includes(gid));

					// Reroll a new global ID if possible
					if (_possible_gID_pool.length) cards[i].card = cardManager.get.globalID(_jsT.choice(_possible_gID_pool));
				}

		return cards;
	};

	const drop_general = async () => {
		/// Randomly pick the cards
		let cards = [];

		for (let i = 0; i < config.drop.count.general; i++) {
			let _category = _jsT.choiceWeighted(Object.values(config.drop.chance).map(c => ({ ...c, rarity: c.CHANCE })));
			let _cards = cardManager.cards.general.filter(card => card.rarity === _category.cardRarityFilter);

			cards.push({
				card: _jsT.choice(_cards, true),
				// Used for getting possible global IDs of the same category to reroll
				_gID_pool: _cards.map(c => c.globalID)
			});
		}

		// Put the user's charm to good use
		if (!user_charms.dupeRepel) await reroll(cards);

		return cards.map(c => c.card);
	};

	const drop_weekly = async () => {
		/// Randomly pick the cards
		let cards = [];

		let _cards = cards_base.shop.filter(card =>
			config.shop.stock.card_set_ids.GENERAL.filter(id => id !== "100").includes(card.setID)
		);

		for (let i = 0; i < config.drop.count.weekly; i++)
			cards.push({
				card: _jsT.choice(_cards, true),
				// Used for getting possible global IDs of the same category to reroll
				_gID_pool: _cards.map(c => c.globalID)
			});

		// Put the user's charm to good use
		if (!user_charms.dupeRepel) await reroll(cards);

		return cards.map(c => c.card);
	};

	switch (dropType) {
		// prettier-ignore
		case "general": return drop_general();

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

module.exports = { drop };
