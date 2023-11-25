/** @typedef {"carrot"|"ribbon"} CurrencyType */
const CurrencyTypes = ["carrot", "ribbon"];

const userManager = require("./uM_index");
const uM_statistics = require("./uM_statistics");

/** @param {string} userID @param {number} amount use a negative number to subtract @param {CurrencyType} currencyType @param {import("./uM_statistics").StatisticType} statType  */
async function increment(userID, amount, currencyType, statType) {
	await Promise.all([
		await userManager.update(userID, { $inc: { [currencyType]: amount } }),
		uM_statistics.push.balance(userID, amount, currencyType, statType)
	]);
}

module.exports = { CurrencyTypes, increment };
