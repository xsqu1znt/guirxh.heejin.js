/** @typedef {"general"|"weekly"|"season"|"event_1"|"event_2"|"cardPack"} DropType */

/** @typedef CardPackOptions
 * @property {{id:number, rarity:number}[]} sets
 * @property {number} count */

const { userManager } = require("./mongo/index");
const cardManager = require("./cardManager");
const _jsT = require("./jsTools");

const config = {
	player: require("../configs/config_player.json"),
	event: require("../configs/config_event.json"),
	shop: require("../configs/config_shop.json"),
	drop: require("../configs/config_drop.json"),
	bot: require("../configs/config_bot.json")
};

/** @param {DropType} dropType @param {number} count @param {CardPackOptions} cardPackOptions  */
async function drop(userID, dropType, cardPackOptions) {
	cardPackOptions = { cardRarity: null, count: null, ...cardPackOptions };

	let user_charms = {
		dupeRepel: await userManager.charms.get(userID, "dupeRepel")
	};

	const reroll = async cards => {
		let card_globalIDs = cards.map(c => c.card.globalID);

		// prettier-ignore
		// Check if the user already has the chosen cards
		let _isDupe = _jsT.isArray(await userManager.inventory.has(userID, cards.map(c => c.card.globalID)));

		// Calculate reroll chances
		let _reroll = _isDupe.map(d => (d ? _jsT.chance(user_charms.dupeRepel.power) : false));

		// Reroll if needed (checks if there's at least 1 true case)
		if (_reroll.filter(r => r).length)
			for (let i = 0; i < _reroll.length; i++)
				if (_reroll[i]) {
					// prettier-ignore
					// Check which cards the user has in the current category
					let _has = (await userManager.inventory.get(userID, { gids: cards[i]._gID_pool }))
						.filter(c => c)
						.map(c => c.globalID);

					let _possible_gID_pool = cards[i]._gID_pool.filter(
						gid => !_has.includes(gid) && !card_globalIDs.includes(cards[i].card.globalID)
					);

					if (!_possible_gID_pool.length)
						console.log(
							`user has all cards in set ${cards[i].card.setID} | triggered by gid ${cards[i].card.globalID}`
						);
					if (_possible_gID_pool.length)
						console.log(
							`possible gID pool for set ${cards[i].card.setID}: ${_possible_gID_pool.join(
								", "
							)} | triggered by gid ${cards[i].card.globalID}`
						);

					// Reroll a new global ID if possible
					if (_possible_gID_pool.length) {
						let rerolledCard = cardManager.get.globalID(_jsT.choice(_possible_gID_pool));
						console.log(`${cards[i].card.globalID} replaced with ${rerolledCard.globalID}`);
						cards[i].card = rerolledCard;
					}
				}

		return cards;
	};

	const drop_general = async () => {
		/// Randomly pick the cards
		let cards = [];

		for (let i = 0; i < config.drop.count.general; i++) {
			let _category = _jsT.choiceWeighted(Object.values(config.drop.chance).map(c => ({ ...c, rarity: c.CHANCE })));
			let _cards = cardManager.cards.general.filter(card => card.rarity === _category.CARD_RARITY_FILTER);

			cards.push({
				card: _jsT.choice(_cards, true),
				// Used for getting possible global IDs of the same category to reroll
				_gID_pool: _cards.map(c => c.globalID)
			});
		}

		// Put the user's charm to good use
		if (user_charms.dupeRepel) await reroll(cards);

		return cards.map(c => c.card);
	};

	const drop_weekly = async () => {
		/// Randomly pick the cards
		let cards = [];
		let _cards = cardManager.cards.shop.general.filter(card =>
			config.shop.stock.card_set_ids.GENERAL.filter(id => id !== "100").includes(card.setID)
		);

		for (let i = 0; i < config.drop.count.weekly; i++)
			cards.push({
				card: _jsT.choice(_cards, true),
				// Used for getting possible global IDs of the same category to reroll
				_gID_pool: _cards.map(c => c.globalID)
			});

		// Put the user's charm to good use
		if (user_charms.dupeRepel) await reroll(cards);

		return cards.map(c => c.card);
	};

	const drop_season = async () => {
		/// Randomly pick the cards
		let cards = [];
		let _cards = cardManager.cards.base.seas.filter(card =>
			config.event.season.CARD_RARITY_FILTER.includes(card.rarity)
		);

		for (let i = 0; i < config.drop.count.season; i++)
			cards.push({
				card: _jsT.choice(_cards, true),
				// Used for getting possible global IDs of the same category to reroll
				_gID_pool: _cards.map(c => c.globalID)
			});

		// Put the user's charm to good use
		if (user_charms.dupeRepel) await reroll(cards);

		return cards.map(c => c.card);
	};

	const drop_event = async eventType => {
		let _CARD_RARITY_FILTER, _count;
		// prettier-ignore
		switch (eventType) {
			case 1: config.event.event_1.CARD_RARITY_FILTER; _count = config.drop.count.event_1; break;
			case 2: config.event.event_1.CARD_RARITY_FILTER; _count = config.drop.count.event_2; break;
			default: return null;
		}

		/// Randomly pick the cards
		let cards = [];
		let _cards = cardManager.cards.event.filter(card => _CARD_RARITY_FILTER.includes(card.rarity));

		for (let i = 0; i < _count; i++)
			cards.push({
				card: _jsT.choice(_cards, true),
				// Used for getting possible global IDs of the same category to reroll
				_gID_pool: _cards.map(c => c.globalID)
			});

		// Put the user's charm to good use
		if (user_charms.dupeRepel) await reroll(cards);

		return cards.map(c => c.card);
	};

	const drop_cardPack = async () => {
		if (!cardPackOptions.sets) return null;

		cardPackOptions.sets = _jsT.isArray(cardPackOptions.sets);

		/// Randomly pick the cards
		let cards = [];

		for (let i = 0; i < cardPackOptions.count; i++) {
			let { id: setID } = _jsT.choiceWeighted(cardPackOptions.sets);
			let _cards = cardManager.get.setID(setID);

			cards.push({
				card: _jsT.choice(_cards, true),
				// Used for getting possible global IDs of the same category to reroll
				_gID_pool: _cards.map(c => c.globalID)
			});
		}

		// Put the user's charm to good use
		if (user_charms.dupeRepel) await reroll(cards);

		return cards.map(c => c.card);
	};

	let cards = null;

	// prettier-ignore
	switch (dropType) {
		case "general": cards = await drop_general(); break;

		case "weekly": cards = await drop_weekly(); break;

		case "season": cards = await drop_season(); break;

		case "event_1": cards = await drop_event(1); break;

		case "event_2": cards = await drop_event(2); break;

		case "cardPack": cards = await drop_cardPack(); break;
	}

	/* - - - - - { Check for Dupes } - - - - - */
	let card_globalIDs = cards.map(c => c.globalID);
	// console.log(card_globalIDs);

	// prettier-ignore
	// Check if the user has duplicates of what was dropped already in their inventory
	let dupeIndex = await userManager.inventory.has(userID, card_globalIDs);

	// Check if the user got duplicates in the drop
	for (let i = 0; i < dupeIndex.length; i++) {
		let previousGlobalIDs = card_globalIDs.slice(0, i);
		if (previousGlobalIDs.includes(card_globalIDs[i])) dupeIndex[i] = true;
	}

	return { cards, dupeIndex };
}

module.exports = { drop };
