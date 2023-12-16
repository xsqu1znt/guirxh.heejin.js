/** @typedef {"user"|"idol"|"xp_user"|"xp_idol"} LevelType */

const userManager = require("./uM_index");

/** @param {string} userID @param {boolean} upsert */
async function exists(userID, upsert = false) {
	let exists = await userManager.models.userQuestData.exists({ _id: userID });

	if (!exists && upsert) await insertNew(userID);

	return exists || upsert ? true : false;
}

/** @param {string} userID @param {{}} query */
async function insertNew(userID, query = {}) {
	let _exists = await exists(userID);

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
	await insertNew(userID);
	return userManager.models.userQuestData.findByIdAndUpdate(userID, query);
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
        case "carrot": await update(userID, { $inc: { balance: amount } }); break;
        case "ribbon": await update(userID, { $inc: { ribbons: amount } }); break;
	}
}

/** @param {string} userID @param {number} amount */
async function increment_cardsNew(userID, amount) {
	await update(userID, { $inc: { inventory_count: amount } });
}

/** @param {string} userID @param {number} amount */
async function increment_teamPower(userID, amount) {
	await update(userID, { $inc: { team_power: amount } });
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

	increment: {
		level: increment_level,
		balance: increment_balance,
		cardsNew: increment_cardsNew,
		teamPower: increment_teamPower,
		dailyStreak: increment_dailyStreak
	}
};
