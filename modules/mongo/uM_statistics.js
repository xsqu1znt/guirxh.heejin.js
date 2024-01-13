/** @typedef {"drop"|"daily"|"random"} StatisticType */

/** @typedef {{name:string, timestamp:number}} options_commandsUsed_increment */

const userManager = require("./uM_index");

/** @param {string} userID @param {boolean} upsert */
async function exists(userID, upsert = false) {
	let exists = await userManager.models.userStatistics.exists({ _id: userID });

	if (!exists && upsert) await insertNew(userID);

	return exists || upsert ? true : false;
}

/** @param {string} userID */
async function fetch(userID) {
	return (await userManager.models.userStatistics.findById(userID)) || null;
}

/** @param {string} userID @param {{}} query @param {boolean} upsert  */
async function update(userID, query, upsert = true) {
	// prettier-ignore
	return userManager.models.userStatistics.findByIdAndUpdate(userID, query, { new: true, upsert, setDefaultsOnInsert: true });
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
async function commandsExecuted_increment(userID, amount = 1) {
	/* options = { name: "", timestamp: Date.now(), ...options };

	// Create the command data
	let data = { name: options.name, timestamp: options.timestamp };

	await update(userID, { $push: { "commands.executed": data } }); */

	await update(userID, { $inc: { commands_executed: amount } });
}

/* - - - - - { Push } - - - - - */
/** @param {string} userID @param {number} amount @param {StatisticType} statType */
async function push_xp(userID, amount, statType) {
	return;
	let data = { name: statType || "n/a", amount };
	await update(userID, { $push: { xp: data } });
}

/**
 * @param {string} userID
 * @param {number} amount
 * @param {import("./uM_balance").CurrencyType} currencyType
 * @param {StatisticType} statType */
async function push_balance(userID, amount, currencyType, statType) {
	return;
	let data = { name: statType || "n/a", amount };

	// prettier-ignore
	switch (currencyType) {
        case "carrot": await update(userID, { $push: { balance: data } }); break;
        case "ribbon": await update(userID, { $push: { ribbons: data } }); break;
	}
}

/* - - - - - { Increment } - - - - - */
/** @param {string} userID @param {number} amount */
async function increment_cardsDropped(userID, amount) {
	await update(userID, { $inc: { cards_dropped: amount } });
}

module.exports = {
	exists,
	fetch,
	update,

	commands: {
		executed: {
			count: commandsExecuted_count,
			increment: commandsExecuted_increment
		}
	},

	push: {
		xp: push_xp,
		balance: push_balance
	},

	increment: { cardsDropped: increment_cardsDropped }
};
