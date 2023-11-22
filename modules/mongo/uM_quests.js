/** @typedef {"user"|"idol"|"xp"} levelType */

const userManager = require("./uM_index");
const uM_balance = require("./uM_balance");

/** @param {string} userID @param {boolean} upsert */
async function exists(userID, upsert = false) {
	let exists = await userManager.models.userQuestData.exists({ _id: userID });

	if (!exists && upsert) await upsert(userID);

	return exists || upsert ? true : false;
}

/** @param {string} userID @param {{}} query */
async function insertNew(userID, query = {}) {
	let exists = await exists(userID);

	if (!exists) {
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
/** @param {string} userID @param {number} amount @param {levelType} levelType  */
async function increment_level(userID, amount, levelType) {
	if (!["user", "idol", "xp"].includes(levelType)) return;

	// prettier-ignore
	switch (levelType) {
		case "user": await update(userID, { $inc: { user_level: amount } }); break;
		case "idol": await update(userID, { $inc: { idol_level: amount } }); break;
		case "xp": await update(userID, { $inc: { xp: amount } }); break;
	}
}

/** @param {string} userID @param {number} amount @param {import("./uM_balance").CurrencyType} currencyType  */
async function increment_balance(userID, amount, currencyType) {
	if (!uM_balance.CurrencyTypes.includes(currencyType)) return;

	// prettier-ignore
	switch (currencyType) {
        case "carrot": await update(userID, { $inc: { balance: amount } }); break;
        case "ribbon": await update(userID, { $inc: { ribbon: amount } }); break;
	}
}

/** @param {string} userID @param {number} amount */
async function increment_inventory(userID, amount) {
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
		inventory: increment_inventory,
		team_power: increment_teamPower,
		dailyStreak: increment_dailyStreak
	}
};
