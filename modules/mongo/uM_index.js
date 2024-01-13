/** @typedef {"id"|"full"|"inventory"|"noInventory"|"essential"|"charm"|"balance"|"xp"|"reminder"} UserDataType */

/** @typedef UserDataFetchOptions
 * @property {UserDataType} type
 * @property {boolean} lean
 * @property {boolean} upsert
 * @property {boolean} awaitQueueCleared */

const config = { player: require("../../configs/config_player.json") };

// Models
const models = {
	user: require("../../models/userModel").model,
	userQuestData: require("../../models/userQuestDataModel").model,
	userStatistics: require("../../models/userStatisticsModel").model
};

async function count() {
	return await models.user.count();
}

/** @param {string} userID @param {boolean} upsert */
async function exists(userID, upsert = false) {
	let exists = await models.user.exists({ _id: userID });

	if (!exists && upsert) await insert(userID);

	return exists || upsert ? true : false;
}

/** @param {string} userID @param {{}} query */
async function insert(userID, query = {}) {
	// prettier-ignore
	// Save a new UserData document if it doesn't exist
	if (!(await exists(userID))) return await new models.user({
		_id: userID,
		balance: config.player.currency.STARTING_BALANCE,
		timestamp_started: Date.now(),
		...query
	}).save();
}

/** @param {string} userID @param {UserDataFetchOptions} options */
async function fetch(userID, options = {}) {
	options = { type: "full", lean: true, upsert: false, awaitQueueCleared: false, ...options };

	// Insert a new UserData document if it doesn't exist
	if (options.upsert) await exists(userID, true);

	// Wait for the Mongo update queue to be clear
	if (options.awaitQueueCleared) await queues.userData.update.on_findByIdAndUpdate_queueCleared(userID);

	// Determine filter type
	let fetchFilter = {};
	switch (options.type) {
		case "id":
			fetchFilter = { _id: 1 };
			break;
		case "full":
			fetchFilter = { __v: 0 };
			break;
		case "inventory":
			fetchFilter = {
				_id: 1,
				card_selected_uid: 1,
				card_favorite_uid: 1,
				card_team_uids: 1,
				card_inventory: 1
			};
			break;
		case "noInventory":
			fetchFilter = { card_inventory: 0 };
			break;
		case "essential":
			fetchFilter = {
				_id: 1,
				daily_streak: 1,
				daily_streak_reminder: 1,
				level: 1,
				xp: 1,
				xp_for_next_level: 1,
				biography: 1,
				balance: 1,
				ribbons: 1,
				badges: 1,
				charms: 1,
				card_selected_uid: 1,
				card_favorite_uid: 1,
				card_team_uids: 1,
				timestamp_started: 1
			};
			break;
		case "charm":
			fetchFilter = { _id: 1, charms: 1 };
			break;
		case "balance":
			fetchFilter = { _id: 1, balance: 1, ribbons: 1 };
			break;
		case "xp":
			fetchFilter = { _id: 1, level: 1, xp: 1, xp_for_next_level: 1 };
			break;
		case "reminder":
			fetchFilter = { _id: 1, daily_streak: 1, daily_streak_expires: 1, cooldowns: 1, reminders: 1 };
			break;
		default:
			fetchFilter = { __v: 0 };
			break;
	}

	/// Fetch the user from the database
	let userData;

	if (userID)
		options.lean
			? (userData = await models.user.findById(userID, fetchFilter).lean())
			: (userData = await models.user.findById(userID, fetchFilter));
	else
		options.lean
			? (userData = await models.user.find({}, fetchFilter).lean())
			: (userData = await models.user.find({}, fetchFilter));

	return userData;
}

/** @param {string | {}} filter userID or filter @param {{}} query @param {{addToQueue:boolean}} options */
async function update(filter, query, options = {}) {
	options = { addToQueue: false, ...options };

	if (typeof filter === "object")
		return options.addToQueue
			? await queues.userData.update.updateOne(filter, query)
			: await models.user.updateOne(filter, query);
	else
		return options.addToQueue
			? await queues.userData.update.findByIdAndUpdate(filter, query)
			: await models.user.findByIdAndUpdate(filter, query);
}

module.exports = {
	models,

	count,
	exists,
	insert,
	fetch,
	update
};
