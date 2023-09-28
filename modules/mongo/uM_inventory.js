/** @typedef {{uids: string|string[], gids:string|string[]}} options_inventory_get */

const cardManager = require("../cardManager");
const userManager = require("./uM_index");
const _jsT = require("../jsTools/_jsT");

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

/** @param {string} userID @param {string | string[]} uids */
async function exists(userID, uids) {
	if (!uids) return false;

	// Create an array if only a single card UID was passed
	uids = _jsT.isArray(uids);

	let exists = await userManager.models.user.exists({ _id: userID, "card_inventory.uid": { $all: uids } });
	return exists ? true : false;
}

/** @param {string} userID @param {string | string[]} globalIDs */
async function has(userID, globalIDs) {
	if (!globalIDs) return null;

	// Create an array if only a single card UID was passed
	globalIDs = _jsT.isArray(globalIDs);

	/// Check the user's card_inventory for the specified global IDs
	let pipeline = [
		{ $unwind: "$card_inventory" },
		{ $match: { _id: userID, "card_inventory.globalID": { $in: globalIDs } } },
		{ $group: { _id: "$_id", card_inventory: { $push: "$card_inventory.globalID" } } }
	];

	let userData = (await userManager.models.user.aggregate(pipeline))[0];
	// prettier-ignore
	if (!userData || !userData?.card_inventory?.length) {
		globalIDs.fill(false); return globalIDs;
	}

	// prettier-ignore
	for (let i = 0; i < globalIDs.length; i++)
		if (userData.card_inventory.includes(globalIDs[i]))
			globalIDs[i] = true;
		else
			globalIDs[i] = false;

	return globalIDs.length > 1 ? globalIDs : globalIDs[0];
}

/** @param {string} userID @param {options_inventory_get} options */
async function get(userID, options) {
	options = { uids: [], gids: [], ...options };
	options.uids = _jsT.isArray(options.uids).map(uid => new RegExp(`^${uid.toUpperCase()}$`, "i"));
	options.gids = _jsT.isArray(options.gids);

	// Create an array if only a single card UID was passed
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
		{ $group: { _id: "$_id", card_inventory: { $push: "$card_inventory" } } }
	];

	let userData = (await userManager.models.user.aggregate(pipeline))[0];

	let cards = [...Array(options.uids.length + options.gids.length)].fill(null);
	// prettier-ignore
	for (let i = 0; i < userData?.card_inventory?.length || 0; i++)
		cards[i] = userData.card_inventory[i];

	// Parse CardLike
	cards = cards.map(c => cardManager.parse.fromCardLike(c));

	return options.uids.length + options.gids.length > 1 ? cards : cards[0];
}

async function get_vault(userID) {
	// Create an aggregation pipeline
	let pipeline = [
		{ $unwind: "$card_inventory" },
		{ $match: { $and: [{ _id: userID }, { "card_inventory.locked": true }] } },
		{ $group: { _id: "$_id", card_inventory: { $push: "$card_inventory" } } }
	];

	let userData = (await userManager.models.user.aggregate(pipeline))[0];

	// Parse CardLike
	let cards = userData.card_inventory.map(c => cardManager.parse.fromCardLike(c));

	return cards;
}

/** @param {string} userID */
async function add(userID, cards) {
	if (!cards || !cards.filter(c => c?.globalID).length) return;

	// Create an array if only a single card object was passed
	cards = _jsT.isArray(cards).filter(c => c?.globalID);

	// Parse the given cards
	let _cards = structuredClone(cards);

	for (let i = 0, c = _cards[i]; i < _cards.length; i++) {
		// Reset the card's UID if needed
		if (!c.uid) cardManager.resetUID(_cards[i]);

		// Parse the card into a CardLike object (ignores custom cards)
		_cards[i] = cardManager.parse.toCardLike(_c);
	}

	const testUIDs = async () => {
		/// Look for cards in the user's card_inventory that have the save UIDs as cards in cards_parsed
		let pipeline = [
			{ $unwind: "$card_inventory" },
			{ $match: { _id: userID, "card_inventory.uid": { $in: _cards.map(c => c.uid) } } },
			{ $group: { _id: "$_id", uids: { $push: "$card_inventory.uid" } } }
		];

		let { uids } = (await userManager.models.user.aggregate(pipeline))[0] || [];
		if (!uids.length) return; // Do nothing if no UIDs were found

		// Iterate through each found UID and make a note of the card's index so we can reset it later
		let reset = [];
		// prettier-ignore
		uids.forEach((uid, idx) => { if (uids.includes(_cards[idx].uid)) reset.push(idx); });

		// Reset card UIDs
		// prettier-ignore
		if (reset.length) reset.forEach(i => cardManager.resetUID(_cards[i]));
		return testUIDs();
	};

	await testUIDs();

	// Push the new cards to the user's card_inventory
	await userManager.update(userID, { $push: { card_inventory: { $each: _cards } } });

	// Add the new cards' UIDs to the given card array
	cards.forEach((c, idx) => (c.uid = `${_cards[idx].uid}`));

	return _cards;
}

/** @param {string} userID @param {string | string[]} uids */
async function remove(userID, uids) {
	if (!uids || !uids.length) return;

	// Create an array if only a single card UID was passed
	uids = _jsT.isArray(uids);

	// Send a pull request to Mongo
	await userManager.update(userID, { $pull: { "card_inventory.uid": { $in: uids } } });
}

/** @param {string} userID */
async function update(userID, card) {
	await userData_update({ _id: userID, "card_inventory.uid": card.uid }, { $set: { "card_inventory.$": card } });
}

/** @param {string} userID */
async function sell(userID, cards) {
	if (!cards || !cards.filter(c => c?.globalID && c?.sellPrice).length) return false;

	// Create an array if only a single card was passed
	cards = _jsT.isArray(cards);

	// Check if the user still has the cards in their card_inventory
	if (!(await exists(userID, uids))) return false;

	// prettier-ignore
	await Promise.all([
		// Update the user's balance
		userData_update(userID, { $inc: { balance: _jsT.sum(cards.map(c => c.sellPrice)) } }),
		// Remove the cards from the user's card_inventory
		remove(userID, cards.map(card => card.uid))
    ]);

	return true;
}

/** @param {string} userID */
async function stats(userID) {
	// Get the name of each card category
	let categories = Object.keys(cardManager.cards.base);

	// prettier-ignore
	/// Count how many cards the user has out of each category
	let cards_user_count = await Promise.all(categories.map(async category => {
		// Get the global IDs for every card in the category
		let _globalIDs = cardManager.cards.globalIDs.base.get(category);

		let pipeline = [
			{ $unwind: "$card_inventory" },
			{ $match: { _id: userID, "card_inventory.globalID": { $in: _globalIDs } } },
			{
				$group: {
					_id: "$_id",
					inventory_count: { $sum: { $size: { $filter: { input: ["$card_inventory.globalID"], cond: "$$this" } } } }
				}
			}
		];

		let { inventory_count } = (await userManager.models.user.aggregate(pipeline))[0] || [];
		return { category, has: inventory_count || 0, outOf: _globalIDs.length };
	}));

	return cards_user_count;
}

module.exports = { count, exists, has, get, getVault: get_vault, add, remove, update, sell, stats };
