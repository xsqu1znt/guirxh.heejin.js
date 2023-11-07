const userManager = require("./uM_index");
const uM_balance = require("./uM_balance");

/** @param {string} userID @param {boolean} upsert */
async function exists(userID, upsert = false) {
	let exists = await userManager.models.userQuestData.exists({ _id: userID });

	if (!exists && upsert) await upsert(userID);

	return exists || upsert ? true : false;
}

/** @param {string} userID @param {{}} query */
async function insert(userID, query = {}) {
	// prettier-ignore
	if (!(await exists(userID))) return await new userManager.models.userQuestData({
		_id: userID, ...query
	}).save();
}

/** @param {string} userID */
async function fetch(userID) {
	return await userManager.models.userQuestData.findById(userID).lean();
}

/** @param {string} userID @param {{}} query */
async function update(userID, query) {
	await insert(userID);
	return userManager.models.userQuestData.findByIdAndUpdate(userID, query);
}

/* - - - - - { Increment } - - - - - */
/** @param {string} userID @param {number} amount */
async function progress_increment_xp(userID, amount) {
	await update(userID, { $inc: { xp: amount } });
}

/** @param {string} userID @param {number} amount @param {import("./uM_balance").CurrencyType} currencyType  */
async function progress_increment_balance(userID, amount, currencyType) {
	if (!uM_balance.CurrencyTypes.includes(currencyType)) return;

	// prettier-ignore
	switch (currencyType) {
        case "carrot": await update(userID, { $inc: { balance: amount } }); break;
        case "ribbon": await update(userID, { $inc: { ribbon: amount } }); break;
	}
}

/** @param {string} userID @param {number} amount */
async function progress_increment_inventory(userID, amount) {
	await update(userID, { $inc: { inventory_count: amount } });
}

module.exports = {
	exists,
	upsert: insert,
	fetch,
	update,

	increment: {
		xp: progress_increment_xp,
		balance: progress_increment_balance,
		inventory: progress_increment_inventory
	}
};
