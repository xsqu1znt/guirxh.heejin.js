/** @typedef {{uids: string|string[], gids:string|string[], sum:boolean}} options_inventory_has */
/** @typedef {{uids: string|string[], gids:string|string[]}} options_inventory_get */

const cardManager = require("../cardManager");
const userManager = require("./uM_index");
const uM_balance = require("./uM_balance");
const uM_quests = require("./uM_quests");
const jt = require("../jsTools");

async function count(userID, uniqueOnly = false) {
	// Create an aggregation pipeline
	let pipeline = [
		{ $match: { _id: userID } },
		uniqueOnly
			? { $project: { card_inventory: { $size: { $setDifference: ["$card_inventory.globalID", []] } } } }
			: { $project: { card_inventory: { $size: "$card_inventory" } } }
	];

	let userData = (await userManager.models.user.aggregate(pipeline))[0];
	return userData ? userData.card_inventory : null;
}

/** @param {string} userID @param {options_inventory_has} options */
async function has(userID, options) {
	options = { uids: [], gids: [], sum: false, ...options };
	options.uids = jt.isArray(options.uids).map(uid => uid.toUpperCase());
	options.gids = jt.isArray(options.gids);

	if (!options.uids.length && !options.gids.length) return null;

	let isUIDOperation = options.uids.length > 0;

	// Create an aggregation pipeline
	let pipeline = isUIDOperation
		? [
				{ $unwind: "$card_inventory" },
				{ $match: { _id: userID, "card_inventory.uid": { $in: options.uids } } },
				{ $group: { _id: "$_id", uids: { $push: "$card_inventory.uid" } } }
		  ]
		: [
				{ $unwind: "$card_inventory" },
				{ $match: { _id: userID, "card_inventory.globalID": { $in: options.gids } } },
				{ $group: { _id: "$_id", gids: { $push: "$card_inventory.globalID" } } }
		  ];

	// Aggregate the user's card_inventory
	let userData = (await userManager.models.user.aggregate(pipeline))[0];

	/* - - - - - { Parse Data } - - - - - */
	let boolArray = isUIDOperation
		? [...Array(options.uids.length)].fill(false)
		: [...Array(options.gids.length)].fill(false);

	// prettier-ignore
	if (!userData || (!userData.uids && !userData.gids))
		if (options.sum) return false; else return boolArray;

	if (isUIDOperation) {
		for (let i = 0; i < options.uids.length; i++) if (userData.uids.includes(options.uids[i])) boolArray[i] = true;
	} else {
		for (let i = 0; i < options.gids.length; i++) if (userData.gids.includes(options.gids[i])) boolArray[i] = true;
	}

	/// Return the results
	if (options.sum) return boolArray.filter(b => b).length === boolArray.length;

	return boolArray.length > 1 ? boolArray : boolArray[0];
}

/** @param {string} userID @param {options_inventory_get} options */
async function get(userID, options) {
	options = { uids: [], gids: [], ...options };
	options.uids = jt.isArray(options.uids).map(uid => new RegExp(`^${uid.toUpperCase()}$`, "i"));
	options.gids = jt.isArray(options.gids);

	if (!options.uids.length && !options.gids.length) return null;

	// prettier-ignore
	// Create an aggregation pipeline
	let pipeline = [
		{ $unwind: "$card_inventory" },
		{
			$match: {
				_id: userID, $or: [
					{ "card_inventory.uid": { $in: options.uids } },
					{ "card_inventory.globalID": { $in: options.gids } }
				]
			}
		},
		{ $group: { _id: "$_id", cards: { $push: "$card_inventory" } } }
	];

	let userData = (await userManager.models.user.aggregate(pipeline))[0];
	if (!userData?.cards?.length) return [];

	// Parse CardLike
	let cards = userData.cards.map(c => cardManager.parse.fromCardLike(c));

	return cards || [];
}

async function get_vault(userID) {
	// Create an aggregation pipeline
	let pipeline = [
		{ $unwind: "$card_inventory" },
		{ $match: { $and: [{ _id: userID }, { "card_inventory.locked": true }] } },
		{ $group: { _id: "$_id", cards_locked: { $push: "$card_inventory" } } }
	];

	let userData = (await userManager.models.user.aggregate(pipeline))[0];

	// Parse CardLike
	if (userData?.cards_locked) return userData.cards_locked.map(c => cardManager.parse.fromCardLike(c));
	return null;
}

/** @param {string} userID */
async function add(userID, cards) {
	if (!cards || (Array.isArray(cards) && !cards.length)) return;

	// Create an array if only a single card object was passed
	cards = jt.isArray(cards).filter(c => c?.globalID);

	// Parse the given cards
	let _cards = cards.map(c => {
		// Deep copies the object to avoid conflictions
		c = structuredClone(c);

		// Reset the card's UID if needed
		if (!c.uid) cardManager.resetUID(c);

		// Return a CardLike object (does not change custom cards)
		return cardManager.parse.toCardLike(c);
	});

	/** Check for duplicate card UIDs in the user's card_inventory */
	const testUIDs = async () => {
		let pipeline = [
			{ $unwind: "$card_inventory" },
			{ $match: { _id: userID, "card_inventory.uid": { $in: _cards.map(c => c.uid) } } },
			{ $group: { _id: "$_id", uids: { $push: "$card_inventory.uid" } } }
		];

		let uids = (await userManager.models.user.aggregate(pipeline))[0]?.uids || [];
		if (!uids.length) return; // Do nothing if no UIDs were found

		/// Iterate through each card and check if its UID matches
		let reset = [];
		_cards.forEach((c, idx) => (uids.includes(c.uid) ? reset.push(idx) : false));

		// Reset card UIDs
		if (reset.length) reset.forEach(i => cardManager.resetUID(_cards[i]));
		return await testUIDs();
	};

	await testUIDs();

	// Push the new cards to the user's card_inventory
	await userManager.update(userID, { $push: { card_inventory: { $each: _cards } } });

	// Append the new UIDs to the original array
	_cards.forEach((c, idx) => (cards[idx].uid = c.uid));

	return _cards;
}

/** @param {string} userID @param {string | string[]} uids */
async function remove(userID, uids) {
	if (!uids || (Array.isArray(uids) && !uids.length)) return;

	// Create an array if only a single card UID was passed
	uids = jt.isArray(uids);

	// Send a pull request to Mongo
	await userManager.update(userID, { $pull: { card_inventory: { uid: { $in: uids } } } });
}

/** @param {string} userID */
async function update(userID, card) {
	await userManager.update({ _id: userID, "card_inventory.uid": card.uid }, { $set: { "card_inventory.$": card } });
}

/** @param {string} userID */
async function sell(userID, cards, validate = true) {
	if (!cards || !cards.filter(c => c?.globalID && c?.sellPrice).length) return { success: false };

	// Create an array if only a single card was passed
	cards = jt.isArray(cards);

	// Check if the user still has the cards in their card_inventory
	if (validate && !(await has(userID, { uids: cards.map(c => c.uid) }))) return { success: false };

	// Calculate sell price sum
	let sellPriceSum = jt.sum(cards.map(c => c.sellPrice));

	// prettier-ignore
	await Promise.all([
		// Update the user's balance
		uM_balance.increment(userID, sellPriceSum, "balance", "sell"),
		uM_quests.increment.balance(userID, sellPriceSum, "balance"),
		// Remove the cards from the user's card_inventory
		remove(userID, cards.map(card => card.uid))
    ]);

	return { success: true, sellTotal: sellPriceSum };
}

/** @param {string} userID */
async function stats(userID) {
	// Get the name of each card category
	let categories = Object.keys(cardManager.cards.base);

	// prettier-ignore
	// Count how many cards the user has out of each category
	let cards_user_count = await Promise.all(categories.map(async category => {
		// Get the global IDs for every card in the category
		let _globalIDs = cardManager.cards.globalIDs.base.get(category);

		let pipeline = [
			{ $unwind: "$card_inventory" },
			{ $match: { _id: userID, "card_inventory.globalID": { $in: _globalIDs } } },
			{
				$group: {
					_id: "$_id",
					gids: { $addToSet: "$card_inventory.globalID" }
				}
			},
			{
				$project: {
					_id: 0,
					inventory_count: { $size: "$gids" }
				}
			}
		];

		let { inventory_count } = (await userManager.models.user.aggregate(pipeline))[0] || [];
		return { name: category, has: inventory_count || 0, outOf: _globalIDs.length };
	}));

	return {
		count: {
			has: jt.sum(cards_user_count.map(cat => cat.has)),
			outOf: cardManager.cards.all.length
		},
		categories: cards_user_count
	};
}

module.exports = { count, has, get, getVault: get_vault, add, remove, update, sell, stats };
