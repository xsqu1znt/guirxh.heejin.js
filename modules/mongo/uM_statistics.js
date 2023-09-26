/** @typedef {"carrot"|"ribbon"} CurrencyType */
const CurrencyTypes = ["carrot", "ribbon"];

/** @typedef {{name:string, timestamp:number}} options_commandsUsed_increment */

const userManager = require("./uM_index");

/** @param {string} userID @param */
async function insert(userID) {
	if (!(await userManager.models.userStatistics.exists({ _id: userID })))
		return await new userManager.models.userStatistics({ timestamp_started: Date.now() }).save();

	return (await userManager.models.userStatistics.findById(userID)) || null;
}

/** @param {string} userID @param {boolean} upsert */
async function fetch(userID, upsert = true) {
	let userDataStats = (await userManager.models.userStatistics.findById(userID)) || null;

	if (!userDataStats && upsert) return await insert();

	return userDataStats;
}

/** @param {string | {_id: string}} filter userID or filter @param {{}} query */
async function update(filter, query) {
	// prettier-ignore
	if (typeof filter === "object")
        return await userManager.models.userStatistics.updateOne(filter, query);
    else
        return await userManager.models.userStatistics.findByIdAndUpdate(filter, query);
}

/** @param {string} userID @param {options_commandsUsed_increment} options */
async function commandsUsed_push(userID, options) {
	options = { name: "", timestamp: Date.now(), ...options };

	// Create the command data
	let data = { name: options.name, timestamp: options.timestamp };

	await update(userID, { $push: { "commands.used": data } });
}

/** @param {string} userID @param {number} amount @param {CurrencyType} currencyType  */
async function balance_increment(userID, amount, currencyType = "carrot") {
	if (!CurrencyTypes.includes(currencyType)) return;

	await update(userID, { $inc: { [`balance.${currencyType}`]: amount } });
}

module.exports = {
	balance: {
		increment: balance_increment
	}
};
