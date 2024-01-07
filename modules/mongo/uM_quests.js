/** @typedef {"user"|"idol"|"xp_user"|"xp_idol"} LevelType */

const uM_inventory = require("./uM_inventory");
const questManager = require("./questManager");
const userManager = require("./uM_index");
const jt = require("../jsTools");

/** @param {string} userID */
async function exists(userID) {
	let exists = await userManager.models.userQuestData.exists({ _id: userID });
	return exists ? true : false;
}

/** @param {string} userID @param {{}} query */
async function insertNew(userID, query = {}) {
	let _exists = await exists(userID);
	if (_exists) return;

	if (!_exists) {
		let _model = new userManager.models.userQuestData({ _id: userID, ...query });
		await _model.save();
	}
}

/** @param {string} userID */
async function fetch(userID) {
	return await userManager.models.userQuestData.findById(userID).lean();
}

/** @param {string} userID @param {{}} query */
async function update(userID, query) {
	// Return if there's no active quests
	if (!questManager.quests_active.length) return;

	await insertNew(userID);
	return userManager.models.userQuestData.findByIdAndUpdate(userID, query);
}

/* - - - - - { Update } - - - - - */
/** @param {string} userID */
async function update_teamPower(userID) {
	// Fetch the user's team cards
	let userData = await userManager.fetch(userID, { type: "essential" });

	let teamCards = await uM_inventory.getMultiple(userID, { uids: userData.card_team_uids });
	if (!teamCards.length) return;

	await update(userID, { team_power: jt.sum(teamCards.map(c => c.stats.ability)) });
}

/* - - - - - { Increment } - - - - - */
/** @param {string} userID @param {number} amount @param {LevelType} levelType  */
async function increment_level(userID, amount, levelType) {
	// prettier-ignore
	switch (levelType) {
		case "user": await update(userID, { $inc: { level_user: amount } }); break;
		case "idol": await update(userID, { $inc: { level_idol: amount } }); break;
		case "xp_user": await update(userID, { $inc: { xp_user: amount } }); break;
		case "xp_idol": await update(userID, { $inc: { xp_idol: amount } }); break;
	}
}

/** @param {string} userID @param {number} amount @param {import("./uM_balance").CurrencyType} currencyType  */
async function increment_balance(userID, amount, currencyType) {
	// prettier-ignore
	switch (currencyType) {
        case "balance": await update(userID, { $inc: { balance: amount } }); break;
        case "ribbons": await update(userID, { $inc: { ribbons: amount } }); break;
	}
}

/** @param {string} userID @param {number} amount */
async function increment_cardsNew(userID, amount) {
	await update(userID, { $inc: { inventory_count: amount } });
}

/** @param {string} userID @param {number} amount */
async function increment_dailyStreak(userID, amount) {
	await update(userID, { $inc: { daily_streak: amount } });
}

module.exports = {
	exists,
	insertNew,
	fetch,
	update,

	update: {
		teamPower: update_teamPower
	},

	increment: {
		level: increment_level,
		balance: increment_balance,
		cardsNew: increment_cardsNew,
		dailyStreak: increment_dailyStreak
	}
};
