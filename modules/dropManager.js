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

	let userCharms = {
		dupeRepel: await userManager.charms.get(userID, "dupeRepel")
	};

	const reroll = async cards => {
		let drop_globalIDs = cards.map(c => c.card.globalID);

		// Check the user's card_inventory for dupes
		let dupeIndex = await userManager.inventory.has(userID, { gids: drop_globalIDs });

		// Check if the user got duplicates in the drop
		for (let i = 0; i < dupeIndex.length; i++) {
			// Filter out the current global ID from the array so we aren't falsly assuming it's a dupe
			let cleanGlobalIDs = drop_globalIDs.filter(gid => gid !== drop_globalIDs[i]);
			// Add back the GID if there's more than 1 instance which counts as an actual dupe
			if (drop_globalIDs.filter(gid => gid === drop_globalIDs[i]).length > 1) cleanGlobalIDs.push(drop_globalIDs[i]);

			// Call dupe if the current global ID already exists in the card array
			if (cleanGlobalIDs.includes(drop_globalIDs[i])) dupeIndex[i] = true;
		}

		// Determine reroll chances
		let chanceForReroll = dupeIndex.map(di => (di ? _jsT.chance(userCharms.dupeRepel.power) : false));
		// Check for at least 1 case of reroll
		if (!chanceForReroll.find(r => r)) return cards;

		/* - - - - - { User Inventory Processing } - - - - - */
		// Gather possible global IDs we can use in the reroll
		let rerollGIDPool = await Promise.all(
			drop_globalIDs.map(async (gid, idx) => {
				if (!chanceForReroll[idx]) return null;

				// Check which cards the user has in their card_inventory from the set
				let _has = await userManager.inventory.has(userID, { gids: cards[idx].setGIDs });

				// Filter out global IDs the user already has of the set in there card_inventory
				// also filters out cards already in the card array
				let possibleGIDs = cards[idx].setGIDs.filter((gid, idx) => !_has[idx] && !drop_globalIDs.includes(gid));

				// prettier-ignore
				// for debugging purposes
				if (!possibleGIDs.length)
					console.log(`trigger: \"${gid}\" | user completed set \"${cards[idx].card.setID}\"`);
				else
					console.log(`trigger: \"${gid}\" | possible global IDs: [${possibleGIDs.join(", ")}]`);

				return possibleGIDs.length ? possibleGIDs : null;
			})
		);

		// Iterate through each reroll chance
		for (let i = 0; i < rerollGIDPool.length; i++) {
			// Skip nulls
			if (!rerollGIDPool[i]) continue;

			// Filter out global IDs of cards already in the card drop array
			let cleanRerollGIDPool = rerollGIDPool[i].filter(gid => !cards.map(c => c.card.globalID).includes(gid));

			// for debugging purposes
			if (!cleanRerollGIDPool.length)
				console.log(
					`trigger: \"${cards[i].card.globalID}\" | idx[${i}] | can't be replaced; it would've been a dupe`
				);

			// Replace the cards
			if (cleanRerollGIDPool.length) {
				let _rerolledCard = cardManager.get.globalID(_jsT.choice(rerollGIDPool[i]));

				// for debugging purposes
				console.log(
					`trigger: \"${cards[i].card.globalID}\" | idx[${i}] | replaced with: \"${_rerolledCard.globalID}\"`
				);

				cards[i].card = _rerolledCard;
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
				setGIDs: _cards.map(c => c.globalID)
			});
		}

		// Put the user's charm to good use
		if (userCharms.dupeRepel) await reroll(cards);

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
				setGIDs: _cards.map(c => c.globalID)
			});

		// Put the user's charm to good use
		if (userCharms.dupeRepel) await reroll(cards);

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
				setGIDs: _cards.map(c => c.globalID)
			});

		// Put the user's charm to good use
		if (userCharms.dupeRepel) await reroll(cards);

		return cards.map(c => c.card);
	};

	const drop_event = async eventType => {
		let _CARD_RARITY_FILTER, _count;

		switch (eventType) {
			case 1:
				_CARD_RARITY_FILTER = config.event.event_1.CARD_RARITY_FILTER;
				_count = config.drop.count.event_1;
				break;

			case 2:
				_CARD_RARITY_FILTER = config.event.event_1.CARD_RARITY_FILTER;
				_count = config.drop.count.event_2;
				break;

			default:
				return null;
		}

		/// Randomly pick the cards
		let cards = [];
		let _cards = cardManager.cards.event.filter(card => _CARD_RARITY_FILTER.includes(card.rarity));

		for (let i = 0; i < _count; i++)
			cards.push({
				card: _jsT.choice(_cards, true),
				// Used for getting possible global IDs of the same category to reroll
				setGIDs: _cards.map(c => c.globalID)
			});

		// Put the user's charm to good use
		if (userCharms.dupeRepel) await reroll(cards);

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
				setGIDs: _cards.map(c => c.globalID)
			});
		}

		// Put the user's charm to good use
		if (userCharms.dupeRepel) await reroll(cards);

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
	let dupeIndex = await userManager.inventory.has(userID, { gids: card_globalIDs });

	// Check if the user got duplicates in the drop
	for (let i = 0; i < dupeIndex.length; i++) {
		let previousGlobalIDs = card_globalIDs.slice(0, i);
		if (previousGlobalIDs.includes(card_globalIDs[i])) dupeIndex[i] = true;
	}

	return { cards, dupeIndex };
}

module.exports = { drop };
