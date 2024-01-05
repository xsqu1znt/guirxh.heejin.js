/** @typedef {"general"|"weekly"|"season"|"event_1"|"event_2"|"cardPack"} DropType */

/** @typedef DropOptions
 * @property {{id:string, rarity:number}[]} sets
 * @property {number} count
 * @property {boolean} ignoreUserCharms */

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
	options = { sets: null, count: null, ignoreUserCharms: false, ...options };

	let userCharms = options.ignoreUserCharms ? {} : { dupeRepel: await userManager.charms.get(userID, "dupeRepel") };

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
			if (!_card) continue; // Incase this is somehow null?

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
					/// NOTE: OR operators are used here incase we already have this data from the cache
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
				// prettier-ignore
				// Remove the chosen card as an option from the selected category card pool
				_cachedCategory.card_pool.splice(_cachedCategory.card_pool.findIndex(c => c.globalID === _card_reroll.globalID), 1);
				// Update the cache
				_dropCategories_cache.set(reroll.card_category.type, _cachedCategory);

				// Replace the dupe card in the array
				cards.splice(i, 1, _card_reroll);
			}
		}

		// Return the card array
		return cards;
	};

	const dupeRepelReroll_cardPool = async (cards, card_pool) => {
		// Check if the user has any of the chosen cards
		let has = await userManager.inventory.has(userID, { gids: cards.map(c => c.globalID) });
		// Ignore processing if the user didn't get dupes of any of the cards
		if (has.filter(b => !b).length === cards.length) return;

		// Get a list of what cards the user already has out of the card_pool
		let has_cardPool = await userManager.inventory.has(userID, { gids: card_pool.map(c => c.globalID) });
		// Ignore processing if the user already has every card in the card_pool
		if (has_cardPool.filter(b => !b).length === card_pool.length) return;

		// Filter out cards the user has in the card_pool
		let card_pool_filtered = card_pool.filter((c, idx) => !has_cardPool[idx]);

		// Iterate through the cards the user already has
		for (let i = 0; i < has.length; i++) {
			let _exists = has[i];
			if (!_exists) continue; // Skip processing non-dupe cards

			let _card = cards[i];
			if (!_card) continue; // Incase this is somehow null?

			// Determine if we even want to put up with this bullshit
			// just kidding, this charm only has a **chance** of working, remember?
			if (!jt.chance(userCharms.dupeRepel.chance_of_working)) continue;

			// Pick a random card from the card pool
			let _card_reroll = jt.choice(card_pool_filtered, true);

			// prettier-ignore
			// Remove the chosen card as an option from the filtered card pool
			card_pool_filtered.splice(card_pool_filtered.findIndex(c => c.globalID === _card_reroll.globalID), 1);

			// Replace the dupe card in the array
			cards.splice(i, 1, _card_reroll);
		}

		// Return the card array
		return cards;
	};

	const dupeRepelReroll_cardPack = async cards => {
		// Check if the user has any of the chosen cards
		let has = await userManager.inventory.has(userID, { gids: cards.map(c => c.globalID) });
		// Ignore processing if the user didn't get dupes of any of the cards
		if (has.filter(b => !b).length === cards.length) return;

		// Create a duplicate of the sets options so we can "cross-out" sets the user completed
		let _cardSets = structuredClone(options.sets);

		// Keep a cache array of what the user's missing in which category so we don't have to reload every time
		let _cardSets_cache = new Map();

		// Iterate through the cards the user already has
		for (let i = 0; i < has.length; i++) {
			let _exists = has[i];
			if (!_exists) continue; // Skip processing non-dupe cards

			let _card = cards[i];
			if (!_card) continue; // Incase this is somehow null?

			// Determine if we even want to put up with this bullshit
			// just kidding, this charm only has a **chance** of working, remember?
			if (!jt.chance(userCharms.dupeRepel.chance_of_working)) continue;

			/* - - - - - { Card Sets } - - - - - */
			const chooseCardSet = async () => {
				// Return if we're out of choices
				if (!_cardSets.length) return null;

				let card_pool, has_set;

				// Pick a random card set by rarity
				let card_set = jt.choiceWeighted(_cardSets);
				// Check if the chosen card set was crossed out already
				// saves time and less load on database queries
				if (!_cardSets.find(c => c.id === card_set.id)) return await chooseCardSet();
				// Check if the chosen card set was queried already
				let _cachedSet = _cardSets_cache.get(card_set.id);
				// saves time and less load on database queries
				if (_cachedSet) {
					card_pool = _cachedSet.card_pool;

					// prettier-ignore
					if (!card_pool.length) {
						// Cross-out the card set option
						_cardSets.splice(_cardSets.findIndex(c => c.id === card_set.id), 1);
						// Run it back, baby!
						return await chooseCardSet();
					}
				} else {
					/// NOTE: OR operators are used here incase we already have this data from the cache
					// Create an array of cards of only the chosen set
					card_pool ||= cardManager.get.setID(card_set.id);
					// Check if the user has any of the cards in the set
					has_set ||= await userManager.inventory.has(userID, { gids: card_pool.map(c => c.globalID) });

					// prettier-ignore
					if (has_set.filter(b => b).length === card_pool.length) {
						// Cross-out the card set option
						_cardSets.splice(_cardSets.findIndex(c => c.id === card_set.id), 1);
						// Run it back, baby!
						return await chooseCardSet();
					}
				}

				if (!_cachedSet) {
					// Filter out cards the user has if we're not using a cached version
					card_pool = card_pool.filter((c, idx) => !has_set[idx]);
					// Update the card set cache
					_cardSets_cache.set(card_set.id, { card_pool });
				}

				// Return the result
				return { card_set, card_pool };
			};

			// Get the new card pool and category
			let reroll = await chooseCardSet();

			if (reroll?.card_pool) {
				// Pick a random card from the card pool
				let _card_reroll = jt.choice(reroll.card_pool, true);

				// Get the chosen category's card pool from cache
				let _cachedSet = _cardSets_cache.get(reroll.card_set.id);
				// prettier-ignore
				// Remove the chosen card as an option from the selected category card pool
				_cachedSet.card_pool.splice(_cachedSet.card_pool.findIndex(c => c.globalID === _card_reroll.globalID), 1);
				// Update the cache
				_cardSets_cache.set(reroll.card_set.id, _cachedSet);

				// Replace the dupe card in the array
				cards.splice(i, 1, _card_reroll);
			}
		}

		// Return the card array
		return cards;
	};

	const drop_general = async () => {
		let _count = options.count > 0 ? options.count : config.drop.count.GENERAL;
		let cards = [];

		// Randomly pick the cards based on weighted category chance
		for (let i = 0; i < _count; i++) {
			// Pick the category
			let card_category = jt.choiceWeighted(dropCategories);
			// Create an array of cards with only the chosen category's card rarity
			let card_pool = cardManager.cards.general.filter(c => c.rarity === card_category.filter);
			// Push a random card to the array
			cards.push(jt.choice(card_pool, true));
		}

		/* - - - - - { User Charms } - - - - - */
		if (!options.ignoreUserCharms) {
			if (userCharms.dupeRepel) await dupeRepelReroll_general(cards);
		}

		return cards;
	};

	const drop_weekly = async () => {
		let _count = options.count > 0 ? options.count : config.drop.count.WEEKLY;
		// filters out custom cards
		let card_pool = cardManager.cards.shop.general.filter(c => c.setID !== "100");
		let cards = [];

		// Randomly pick the cards
		for (let i = 0; i < _count; i++) {
			// Push a random card from the shop to the array
			cards.push(jt.choice(card_pool, true));
		}

		/* - - - - - { User Charms } - - - - - */
		if (!options.ignoreUserCharms) {
			if (userCharms.dupeRepel) await dupeRepelReroll_cardPool(cards, card_pool);
		}

		return cards;
	};

	const drop_season = async () => {
		let _count = options.count > 0 ? options.count : config.drop.count.SEASON;
		let card_pool = cardManager.cards.base.seas.filter(c => config.event.season.CARD_RARITY_FILTER.includes(c.rarity));
		let cards = [];

		// Randomly pick the cards
		for (let i = 0; i < _count; i++) {
			// Push a random card from the shop to the array
			cards.push(jt.choice(card_pool, true));
		}

		/* - - - - - { User Charms } - - - - - */
		if (!options.ignoreUserCharms) {
			if (userCharms.dupeRepel) await dupeRepelReroll_cardPool(cards, card_pool);
		}

		return cards;
	};

	const drop_event = async eventType => {
		let _CARD_RARITY_FILTER, _count;

		switch (eventType) {
			case 1:
				_CARD_RARITY_FILTER = config.event.event_1.CARD_RARITY_FILTER;
				_count = options.count > 0 ? options.count : config.drop.count.event_1;
				break;

			case 2:
				_CARD_RARITY_FILTER = config.event.event_1.CARD_RARITY_FILTER;
				_count = options.count > 0 ? options.count : config.drop.count.event_2;
				break;

			default:
				return null;
		}

		let card_pool = cardManager.cards.event.filter(c => _CARD_RARITY_FILTER.includes(c.rarity));
		let cards = [];

		// Randomly pick the cards
		for (let i = 0; i < _count; i++) {
			// Push a random card from the shop to the array
			cards.push(jt.choice(card_pool, true));
		}

		/* - - - - - { User Charms } - - - - - */
		if (!options.ignoreUserCharms) {
			if (userCharms.dupeRepel) await dupeRepelReroll_cardPool(cards, card_pool);
		}

		return cards;
	};

	const drop_cardPack = async () => {
		if (!options.sets) return [];
		options.sets = jt.isArray(options.sets);

		let cards = [];

		// Randomly pick the cards
		for (let i = 0; i < options?.count || config.drop.count.SEASON; i++) {
			// Pick the category
			let card_set = jt.choiceWeighted(options.sets);
			// Create an array of cards of only the chosen set
			let card_pool = cardManager.get.setID(card_set.id);
			// Push a random card from the shop to the array
			cards.push(jt.choice(card_pool, true));
		}

		/* - - - - - { User Charms } - - - - - */
		if (!options.ignoreUserCharms) {
			if (userCharms.dupeRepel) await dupeRepelReroll_cardPack(cards);
		}

		return cards;
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

	// Check if the user has duplicates their card_inventory
	let dupeIndex = await userManager.inventory.has(userID, { gids: card_globalIDs });

	// Check if the user got duplicates inside the drop itself
	for (let i = 0; i < dupeIndex.length; i++) {
		let previousGlobalIDs = card_globalIDs.slice(0, i);
		if (previousGlobalIDs.includes(card_globalIDs[i])) dupeIndex[i] = true;
	}

	return { cards, dupeIndex };
}

module.exports = { drop };
