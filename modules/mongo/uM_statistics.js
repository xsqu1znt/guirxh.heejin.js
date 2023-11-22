/** @typedef {{name:string, timestamp:number}} options_commandsUsed_increment */

/** @typedef {"drop"|"random"} StatisticType */
/** @typedef {"carrot"|"ribbon"} CurrencyType */
const CurrencyTypes = ["carrot", "ribbon"];
/** @typedef {"drop"|"random"} CommandType_XP */
const CommandTypes_XP = ["drop", "random"];

const userManager = require("./uM_index");

/** @param {string} userID @param {boolean} upsert */
async function exists(userID, upsert = false) {
	let exists = await userManager.models.userStatistics.exists({ _id: userID });

	if (!exists && upsert) await upsert(userID);

	return exists || upsert ? true : false;
}

/** @param {string} userID @param */
async function upsert(userID, query = {}) {
	if (!exists({ _id: userID }))
		return await new userManager.models.userStatistics({
			_id: userID,
			timestamp_data_created: Date.now(),
			...query
		}).save();
}

/** @param {string} userID */
async function fetch(userID) {
	return (await userManager.models.userStatistics.findById(userID)) || null;
}

/** @param {string} userID @param {{}} query */
async function update(userID, query) {
	await upsert(userID);
	return userManager.models.userStatistics.findByIdAndUpdate(userID, query);
}

/* - - - - - { Commands } - - - - - */
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
	options = { name: "", timestamp: Date.now(), ...options };

	// Create the command data
	let data = { name: options.name, timestamp: options.timestamp };

	await update(userID, { $push: { "commands.executed": data } });
}

/* - - - - - { Levels } - - - - - */
/** @param {string} userID @param {number} amount @param {CommandType_XP} commandType_XP  */
async function level_xp_increment(userID, amount, commandType_XP) {
	if (!CommandTypes_XP.includes(commandType_XP)) return;
	await update(userID, { $inc: { [`level.xp.${commandType_XP}`]: amount } });
}

/* - - - - - { Balance } - - - - - */
/** @param {string} userID @param {number} amount @param {CurrencyType} currencyType  */
async function balance_increment(userID, amount, currencyType = "carrot") {
	if (!CurrencyTypes.includes(currencyType)) return;
	await update(userID, { $inc: { [`balance.${currencyType}`]: amount } });
}

module.exports = {
	exists,
	upsert,
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
