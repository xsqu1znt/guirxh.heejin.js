const userManager = require("./uM_index");
const uM_statistics = require("./uM_statistics");

const _aJM = require("../asyncJobManager");

/** @param {string} userID @param {number} amount use a negative number to subtract @param {StatisticType} statType */
async function increment(userID, amount, currencyType) {
	let job = new _aJM.Job();

	// prettier-ignore
	switch (currencyType) {
		case "carrots": job.add(userManager.update(userID, { $inc: { balance: amount } })); break;
		case "ribbons": job.add(userManager.update(userID, { $inc: { ribbons: amount } })); break;
		default: return;
	}

	// prettier-ignore
	if (amount) switch (currencyType) {
		case "carrots": job.add(uM_statistics.balance.increment(userID, amount, currencyType)); break;
		case "ribbons": job.add(uM_statistics.balance.increment(userID, amount, currencyType)); break;
		default: return;
	}

	await job.await();
}

module.exports = { increment };
