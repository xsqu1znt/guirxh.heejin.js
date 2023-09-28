const userManager = require("./uM_index");
const uM_balance = require("./uM_balance");

/** @param {string} userID @param {number} amount */
async function progress_xp_increment(userID, amount) {
	await userManager.models.userQuestData.findByIdAndUpdate(userID, { $inc: { xp: amount } });
}

/** @param {string} userID @param {number} amount @param {import("./uM_balance").CurrencyType} currencyType  */
async function progress_balance_increment(userID, amount, currencyType) {
	if (!uM_balance.CurrencyTypes.includes(currencyType)) return;

	// prettier-ignore
	switch (currencyType) {
        case "carrot": await userManager.models.userQuestData.findByIdAndUpdate(userID, { $inc: { balance: amount } }); break;
        case "ribbon": await userManager.models.userQuestData.findByIdAndUpdate(userID, { $inc: { ribbon: amount } }); break;
	}
}

/** @param {string} userID @param {number} amount */
async function progress_inventory_increment(userID, amount) {
	await userManager.models.userQuestData.findByIdAndUpdate(userID, { $inc: { inventory_count: amount } });
}

module.exports = {
	progress: {
		xp: { increment: progress_xp_increment },
		balance: { increment: progress_balance_increment },
		inventory: { increment: progress_inventory_increment }
	}
};
