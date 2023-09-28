/** @typedef {"drop"|"random"} StatisticType */

/** @typedef {"drop"|"random"} CommandType_XP */
const CommandTypes_XP = ["drop", "random"];

/** @typedef {{name:string, timestamp:number}} options_commandsUsed_increment */

const userManager = require("./uM_index");
const uM_balance = require("./uM_balance");

/** @param {string} userID @param */
async function insert(userID) {
	if (!(await userManager.models.userStatistics.exists({ _id: userID })))
		return await new userManager.models.userStatistics({ _id: userID, timestamp_data_created: Date.now() }).save();

	return (await userManager.models.userStatistics.findById(userID)) || null;
}

/** @param {string} userID @param {boolean} upsert */
async function fetch(userID, upsert = true) {
	let userDataStats = (await userManager.models.userStatistics.findById(userID)) || null;

	if (!userDataStats && upsert) return await insert();

	return userDataStats;
}

/** @param {string | {}} filter userID or filter @param {{}} query */
async function update(filter, query) {
	// prettier-ignore
	if (typeof filter === "object")
        return await userManager.models.userStatistics.updateOne(filter, query);
    else
        return await userManager.models.userStatistics.findByIdAndUpdate(filter, query);
}

/// Commands
/** @param {string} userID @param */
async function commandsExecuted_count(userID) {
	// prettier-ignore
	// Create an aggregation pipeline
	let pipeline = [
		{ $match: { _id: userID } },
		{ $project: { count: { $size: "$commands.executed" } } }
	];

	let { count } = (await userManager.models.userStatistics.aggregate(pipeline))[0];
	return count ? count : 0;
}

/** @param {string} userID @param {options_commandsUsed_increment} options */
async function commandsExecuted_push(userID, options) {
	await insert(userID);

	options = { name: "", timestamp: Date.now(), ...options };

	// Create the command data
	let data = { name: options.name, timestamp: options.timestamp };

	await update(userID, { $push: { "commands.executed": data } });
}

/// Levels
/** @param {string} userID @param {number} amount @param {CommandType_XP} commandType_XP  */
async function level_xp_increment(userID, amount, commandType_XP) {
	await insert(userID);

	if (!CommandTypes_XP.includes(commandType_XP)) return;
	await update(userID, { $inc: { [`level.xp.${commandType_XP}`]: amount } });
}

/// Balance
/** @param {string} userID @param {number} amount @param {import("./uM_balance").CurrencyType} currencyType  */
async function balance_increment(userID, amount, currencyType = "carrot") {
	await insert(userID);

	if (!uM_balance.CurrencyTypes.includes(currencyType)) return;
	await update(userID, { $inc: { [`balance.${currencyType}`]: amount } });
}

module.exports = {
	insert,
	fetch,
	update,

	commands: {
		executed: {
			count: commandsExecuted_count,
			push: commandsExecuted_push
		}
	},

	level: {
		xp: {
			increment: level_xp_increment
		}
	},

	balance: {
		increment: balance_increment
	}
};
