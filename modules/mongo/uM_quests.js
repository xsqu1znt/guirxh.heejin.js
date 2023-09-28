const userManager = require("./uM_index");
const uM_balance = require("./uM_balance");

/// Increment
/** @param {string} userID @param {number} amount */
async function progress_increment_xp(userID, amount) {
	await userManager.models.userQuestData.findByIdAndUpdate(userID, { $inc: { xp: amount } });
}

/** @param {string} userID @param {number} amount @param {import("./uM_balance").CurrencyType} currencyType  */
async function progress_increment_balance(userID, amount, currencyType) {
	if (!uM_balance.CurrencyTypes.includes(currencyType)) return;

	// prettier-ignore
	switch (currencyType) {
        case "carrot": await userManager.models.userQuestData.findByIdAndUpdate(userID, { $inc: { balance: amount } }); break;
        case "ribbon": await userManager.models.userQuestData.findByIdAndUpdate(userID, { $inc: { ribbon: amount } }); break;
	}
}

/** @param {string} userID @param {number} amount */
async function progress_increment_inventory(userID, amount) {
	await userManager.models.userQuestData.findByIdAndUpdate(userID, { $inc: { inventory_count: amount } });
}

module.exports = {
	progress: {
		increment: {
			xp: progress_increment_xp,
			balance: progress_increment_balance,
			inventory: progress_increment_inventory
		}
	}
};
