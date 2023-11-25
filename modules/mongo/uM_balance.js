/** @typedef {"balance"|"ribbons"} CurrencyType */

const userManager = require("./uM_index");
const uM_statistics = require("./uM_statistics");

/** @param {string} userID @param {number} amount use a negative number to subtract @param {CurrencyType} currencyType @param {import("./uM_statistics").StatisticType} statType  */
async function increment(userID, amount, currencyType, statType) {
	await Promise.all([
		userManager.update(userID, { $inc: { [currencyType]: amount } }),
		uM_statistics.push.balance(userID, amount, currencyType, statType)
	]);
}

module.exports = { increment };
