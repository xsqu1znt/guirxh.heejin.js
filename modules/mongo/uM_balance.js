const userManager = require("./uM_index");
const uM_statistics = require("./uM_statistics");

/** @param {string} userID @param {number} amount use a negative number to subtract @param {StatisticType} statType */
async function increment(userID, amount, currencyType) {
	// prettier-ignore
	switch (currencyType) {
		case "carrots": await userManager.update(userID, { $inc: { balance: amount } }); break;
		case "ribbons": await userManager.update(userID, { $inc: { ribbons: amount } }); break;
		default: return;
	}

	// prettier-ignore
	if (amount) switch (currencyType) {
		case "carrots": await uM_statistics.increment_carrots(userID, amount); break;
		case "ribbons": await uM_statistics.increment_ribbons(userID, amount); break;
		default: return;
	}
}

module.exports = { increment };
