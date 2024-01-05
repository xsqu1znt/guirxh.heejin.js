/** @typedef {"general"|"weekly"|"season"|"event_1"|"event_2"|"cardPack"} DropType */

/** @typedef DropOptions
 * @property {{id:number, rarity:number}[]} sets
 * @property {number} count */

const { userManager } = require("./mongo/index");
const cardManager = require("./cardManager");
const jt = require("./jsTools");

const config = {
	player: require("../configs/config_player.json"),
	event: require("../configs/config_event.json"),
	shop: require("../configs/config_shop.json"),
	drop: require("../configs/config_drop.json"),
	bot: require("../configs/config_bot.json")
};

const dropCategories = Object.entries(config.drop.chance).map(e => ({
	type: e[0],
	rarity: e[1].rarity,
	filter: e[1].CARD_RARITY_FILTER
}));

/** @param {DropType} dropType @param {number} count @param {DropOptions} options  */
async function drop(userID, dropType, options) {
	options = { sets: null, count: null, ...options };

	let userCharms = {
		dupeRepel: await userManager.charms.get(userID, "dupeRepel")
	};

	const dupeRepelReroll_general = async cards => {
		// Check if the user has any of the chosen cards
		let has = await userManager.inventory.has(userID, { gids: cards.map(c => c.globalID) });
		// Ignore processing if the user didn't get dupes of any of the cards
		if (has.filter(b => !b).length === cards.length) return;

		// Create a duplicate of dropCategories so we can "cross-out" categories the user completed
		let _dropCategories = structuredClone(dropCategories);

		// Keep a cache array of what the user's missing in which category so we don't have to reload every time
		let _dropCategories_cache = new Map();

		// Iterate through the cards the user already has
		for (let i = 0; i < has.length; i++) {
			let _exists = has[i];
			if (!_exists) continue; // Skip processing non-dupe cards

			let _card = cards[i];
			if (!_card) continue; // In case this is somehow null?

			// Determine if we even want to put up with this bullshit
			// just kidding, this charm only has a **chance** of working, remember?
			if (!jt.chance(userCharms.dupeRepel.chance_of_working)) continue;

			/* - - - - - { Card Category } - - - - - */
			const chooseCardCategory = async () => {
				// Return if we're out of choices
				if (!_dropCategories.length) return null;

				let card_pool, has_category;

				// Pick a random category by rarity
				let card_category = jt.choiceWeighted(_dropCategories);
				// Check if the chosen category was crossed out already
				// saves time and less load on database queries
				if (!_dropCategories.find(c => c.type === card_category.type)) return await chooseCardCategory();
				// Check if the chosen category was queried already
				let _cachedCategory = _dropCategories_cache.get(card_category.type);
				// saves time and less load on database queries
				if (_cachedCategory) {
					card_pool = _cachedCategory.card_pool;

					// prettier-ignore
					if (!card_pool.length) {
						// Cross-out the category option
						_dropCategories.splice(_dropCategories.findIndex(c => c.type === card_category.type), 1);
						// Run it back, baby!
						return await chooseCardCategory();
					}
				} else {
					/// NOTE: or operators or used here incase we already have this data from the cache
					// Create an array of cards with only the chosen category's card rarity
					card_pool ||= cardManager.cards.general.filter(c => c.rarity === card_category.filter);
					// Check if the user has any of the cards in the category
					has_category ||= await userManager.inventory.has(userID, { gids: card_pool.map(c => c.globalID) });

					// prettier-ignore
					if (has_category.filter(b => b).length === card_pool.length) {
						// Cross-out the category option
						_dropCategories.splice(_dropCategories.findIndex(c => c.type === card_category.type), 1);
						// Run it back, baby!
						return await chooseCardCategory();
					}
				}

				if (!_cachedCategory) {
					// Filter out cards the user has if we're not using a cached version
					card_pool = card_pool.filter((c, idx) => !has_category[idx]);
					// Update the category cache
					_dropCategories_cache.set(card_category.type, { card_pool });
				}

				// Return the result
				return { card_category, card_pool };
			};

			// Get the new card pool and category
			let reroll = await chooseCardCategory();

			if (reroll?.card_pool) {
				// Pick a random card from the card pool
				let _card_reroll = jt.choice(reroll.card_pool, true);

				// Get the chosen category's card pool from cache
				let _cachedCategory = _dropCategories_cache.get(reroll.card_category.type);
				// Remove the chosen card as an option from the selected category card pool
				_cachedCategory.card_pool.splice(
					_cachedCategory.card_pool.findIndex(c => c.globalID === _card_reroll.globalID),
					1
				);
				// Update the cache
				_dropCategories_cache.set(reroll.card_category.type, _cachedCategory);

				// Replace the dupe card in the array
				cards.splice(i, 1, _card_reroll);
			}
		}

		// Return the card array
		return cards;
	};

	const dupeRepelReroll = async (cards, card_pool) => {
		// Check if the user has any of the chosen cards
		let has = await userManager.inventory.has(userID, { gids: cards.map(c => c.globalID) });
		// Ignore processing if the user didn't get dupes of any of the cards
		if (has.filter(b => !b).length === cards.length) return;

		// Get a list of what cards the user already has out of the card_pool
		let has_cardPool = await userManager.inventory.has(userID, { gids: card_pool.map(c => c.globalID) });
		// Ignore processing if the user already has every card in the card_pool
		if (has_cardPool.filter(b => !b).length === card_pool.length) return;

		// Filter out cards the user has in the card_pool
		card_pool = card_pool.filter((c, idx) => !has_cardPool[idx]);

		// Iterate through the cards the user already has
		for (let i = 0; i < has.length; i++) {
			let _exists = has[i];
			if (!_exists) continue; // Skip processing non-dupe cards

			let _card = cards[i];
			if (!_card) continue; // In case this is somehow null?

			// Determine if we even want to put up with this bullshit
			// just kidding, this charm only has a **chance** of working, remember?
			if (!jt.chance(userCharms.dupeRepel.chance_of_working)) continue;
		}

		// Return the card array
		return cards;
	};

	const drop_general = async () => {
		let cards = [];

		// Randomly pick the cards based on weighted category chance
		for (let i = 0; i < options?.count || config.drop.count.GENERAL; i++) {
			// Pick the category
			let card_category = jt.choiceWeighted(dropCategories);
			// Create an array of cards with only the chosen category's card rarity
			let card_pool = cardManager.cards.general.filter(c => c.rarity === card_category.filter);
			// Push a random card to the array
			cards.push(jt.choice(card_pool, true));
		}

		/* - - - - - { User Charms } - - - - - */
		if (userCharms.dupeRepel) await dupeRepelReroll_general(cards);

		return cards;
	};

	const drop_weekly = async () => {
		let cards = [];

		// Randomly pick the cards
		for (let i = 0; i < options?.count || config.drop.count.WEEKLY; i++) {
			// Push a random card from the shop to the array
			cards.push(jt.choice(cardManager.cards.shop.generalClean, true));
		}

		/* - - - - - { User Charms } - - - - - */
		if (userCharms.dupeRepel) await dupeRepelReroll(cards, cardManager.cards.shop.generalClean);

		return cards;
	};

	const drop_season = async () => {
		/// Randomly pick the cards
		let cards = [];
		let _cards = cardManager.cards.base.seas.filter(card =>
			config.event.season.CARD_RARITY_FILTER.includes(card.rarity)
		);

		for (let i = 0; i < config.drop.count.season; i++)
			cards.push({
				card: jt.choice(_cards, true),
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
				card: jt.choice(_cards, true),
				// Used for getting possible global IDs of the same category to reroll
				setGIDs: _cards.map(c => c.globalID)
			});

		// Put the user's charm to good use
		if (userCharms.dupeRepel) await reroll(cards);

		return cards.map(c => c.card);
	};

	const drop_cardPack = async () => {
		if (!options.sets) return null;

		options.sets = jt.isArray(options.sets);

		/// Randomly pick the cards
		let cards = [];

		for (let i = 0; i < options.count; i++) {
			let { id: setID } = jt.choiceWeighted(options.sets);
			let _cards = cardManager.get.setID(setID);

			cards.push({
				card: jt.choice(_cards, true),
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
