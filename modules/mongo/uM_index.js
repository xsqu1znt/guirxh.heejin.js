/** @typedef {"id"|"full"|"inventory"|"noInventory"|"essential"|"charm"|"balance"|"xp"|"reminder"|"quest"} UserDataType */

/** @typedef UserDataFetchOptions
 * @property {UserDataType} type
 * @property {boolean} lean
 * @property {boolean} upsert
 * @property {boolean} awaitQueueCleared */

/** @typedef {"dupeRepel"} CharmType */

/** @typedef {"drop_general"|"drop_weekly"|"drop_season"|"drop_event_1"|"drop_event_2"|"random"} CooldownType */

/** @typedef {"dm"|"channel"} ReminderNotificationMode */

/** @typedef {"drop"|"random"} StatisticType */

/** @typedef {{uids: string|string[], gids:string|string[]}} options_inventory_get */

// const badgeManager = require('./badgeManager');
const cardManager = require("../cardManager");
const _jsT = require("../jsTools/_jsT");

const playerConfig = require("../../configs/config_player.json");

// Models
const models = {
	user: require("../../models/userModel").model,
	userQuestData: require("../../models/userQuestDataModel").model,
	userStatistics: require("../../models/userStatisticsModel").model
};

// Queues
/* const MongoQueueManager = require("../queueManager");
const queues = {
	userData: { update: new MongoQueueManager(models.user) }
}; */

//! UserData
async function userData_count() {
	return await models.user.count();
}

/** @param {string} userID @param {boolean} upsert */
async function userData_exists(userID, upsert = false) {
	let exists = await models.user.exists({ _id: userID });

	if (!exists && upsert) await userData_insert(userID);

	return exists || upsert ? true : false;
}

/** @param {string} userID @param {{}} query */
async function userData_insert(userID, query = {}) {
	// prettier-ignore
	// Save a new UserData document if it doesn't exist
	if (!(await userData_exists(userID))) return await new models.user({
		_id: userID,
		balance: playerConfig.currency.STARTING_BALANCE,
		timestamp_started: Date.now(),
		...query
	}).save();
}

/** @param {string} userID @param {UserDataFetchOptions} options */
async function userData_fetch(userID, options = {}) {
	options = { type: "full", lean: true, upsert: false, awaitQueueCleared: false, ...options };

	// Insert a new UserData document if it doesn't exist
	if (options.upsert) await userData_exists(userID, true);

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
		case "quest":
			fetchFilter = { _id: 1, quests_complete: 1 };
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
async function userData_update(filter, query, options = {}) {
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

//! UserData -> XP
/** @param {string} userID @param {number} amount use a negative number to subtract @param {StatisticType} statType */
async function xp_increment(userID, amount, statType = null) {
	await userData_update(userID, { $inc: { xp: amount } });

	// prettier-ignore
	switch (statType) {
		case "drop": await statistics_update(userID, { $inc: { "xp.drop": amount } }); break;
		case "random": await statistics_update(userID, { $inc: { "xp.random": amount } }); break;
		default: break;
	}
}

//! UserData -> Currency
/** @param {string} userID @param {number} amount use a negative number to subtract @param {StatisticType} statType */
async function currency_increment(userID, amount, currencyType, statType = null) {
	// prettier-ignore
	switch (currencyType) {
		case "carrots": await userData_update(userID, { $inc: { balance: amount } }); break;
		case "ribbons": await userData_update(userID, { $inc: { ribbons: amount } }); break;
		default: return;
	}

	// prettier-ignore
	switch (currencyType) {
		case "carrots": await statistics_increment_carrots(userID, amount); break;
		case "ribbons": await statistics_increment_ribbons(userID, amount); break;
		default: return;
	}
}

/** @param {string} userID */
async function xp_levelUp(userID) {
	// Fetch the user from Mongo
	let userData = await userData_fetch(userID, { type: "xp", awaitQueueCleared: true });

	// Used to keep track of what happened
	let session = {
		leveled: false,
		levels_gained: 0,

		/** @type {number} */
		level_current: userData.level
	};

	const levelUp = () => {
		if (userData.level >= playerConfig.xp.user.LEVEL_MAX) return;

		if (userData.xp >= userData.xp_for_next_level) {
			// Subtract the required XP to level up from the user
			userData.xp = userData.xp - userData.xp_for_next_level || 0;

			// Increase the user's level
			userData.level++;

			// Calculate the XP required for the next level
			userData.xp_for_next_level = Math.floor(userData.level * playerConfig.xp.user.LEVEL_XP_MULTIPLIER);

			// Update session data
			session.levels_gained++;
			session.leveled = true;
		}
	};

	// Level up the user until they can't anymore
	while (userData.xp >= userData.xp_for_next_level) levelUp();

	// Push the update to Mongo
	if (session.leveled)
		await userData_update(userID, {
			level: userData.level,
			xp: userData.xp,
			xp_for_next_level: userData.xp_for_next
		});

	return session;
}

//! UserData -> Cards
async function inventory_count(userID, uniqueOnly = false) {
	// Create an aggregation pipeline
	let pipeline = [
		{ $match: { _id: userID } },
		uniqueOnly
			? { $project: { card_inventory: { $size: { $setDifference: ["$card_inventory.globalID", []] } } } }
			: { $project: { card_inventory: { $size: "$card_inventory" } } }
	];

	let userData = (await models.user.aggregate(pipeline))[0];
	return userData ? userData.card_inventory : null;
}

/** @param {string} userID @param {string | string[]} uids */
async function inventory_exists(userID, uids) {
	// Create an array if only a single card UID was passed
	if (!uids) return false;
	if (!Array.isArray(uids)) uids = [uids];

	let exists = await models.user.exists({ _id: userID, "card_inventory.uid": { $all: uids } });
	return exists ? true : false;
}

/** @param {string} userID @param {string | string[]} globalIDs */
async function inventory_has(userID, globalIDs) {
	// Create an array if only a single card UID was passed
	if (!globalIDs) return null;
	if (!Array.isArray(globalIDs)) globalIDs = [globalIDs];

	/// Check the user's card_inventory for the specified global IDs
	let pipeline = [
		{ $unwind: "$card_inventory" },
		{ $match: { _id: userID, "card_inventory.globalID": { $in: globalIDs } } },
		{ $group: { _id: "$_id", card_inventory: { $push: "$card_inventory.globalID" } } }
	];

	let userData = (await models.user.aggregate(pipeline))[0];
	// prettier-ignore
	if (!userData || !userData?.card_inventory?.length) {
		globalIDs.fill(false); return globalIDs;
	}

	// prettier-ignore
	for (let i = 0; i < globalIDs.length; i++)
		if (userData.card_inventory.includes(globalIDs[i]))
			globalIDs[i] = true;
		else
			globalIDs[i] = false;

	return globalIDs.length > 1 ? globalIDs : globalIDs[0];
}

/** @param {string} userID @param {options_inventory_get} options */
async function inventory_get(userID, options) {
	options = { uids: [], gids: [], ...options };
	options.uids = _jsT.isArray(options.uids).map(uid => new RegExp(`^${uid.toUpperCase()}$`, "i"));
	options.gids = _jsT.isArray(options.gids);

	// Create an array if only a single card UID was passed
	if (!options.uids.length && !options.gids.length) return null;

	// prettier-ignore
	// Create an aggregation pipeline
	let pipeline = [
		{ $unwind: "$card_inventory" },
		{
			$match: {
				_id: userID, $or: [
					{ "card_inventory.uid": { $in: options.uids } },
					{ "card_inventory.globalID": { $in: options.gids } }
				]
			}
		},
		{ $group: { _id: "$_id", card_inventory: { $push: "$card_inventory" } } }
	];

	let userData = (await models.user.aggregate(pipeline))[0];

	let cards = [...Array(options.uids.length + options.gids.length)].fill(null);
	// prettier-ignore
	for (let i = 0; i < userData?.card_inventory?.length || 0; i++)
		cards[i] = userData.card_inventory[i];

	// Parse CardLike
	cards = cards.map(c => cardManager.parse.fromCardLike(c));

	return options.uids.length + options.gids.length > 1 ? cards : cards[0];
}

async function inventory_get_vault(userID) {
	// Create an aggregation pipeline
	let pipeline = [
		{ $unwind: "$card_inventory" },
		{ $match: { $and: [{ _id: userID }, { "card_inventory.locked": true }] } },
		{ $group: { _id: "$_id", card_inventory: { $push: "$card_inventory" } } }
	];

	let userData = (await models.user.aggregate(pipeline))[0];

	// Parse CardLike
	let cards = userData.card_inventory.map(c => cardManager.parse.fromCardLike(c));

	return cards;
}

/** @param {string} userID */
async function inventory_add(userID, cards) {
	// Create an array if only a single card object was passed
	// filtering out invalid cards in the process
	if (!cards) return;
	if (!Array.isArray(cards)) cards = [cards].filter(card => card?.globalID);

	// Fetch the user's card_inventory
	let { card_inventory } = await userData_fetch(userID, { type: "inventory" });

	// Parse the user's CardLikes into an array of uids to compare
	let uidList = card_inventory.map(card => card?.uid).filter(uid => uid);

	// Parse the given cards
	let cards_parsed = structuredClone(cards);

	for (let i = 0; i < cards_parsed.length; i++) {
		// Reset the card's UID if necessary
		while (!cards_parsed[i]?.uid || uidList.includes(cards_parsed[i]?.uid)) cardManager.resetUID(cards_parsed[i]);

		// Add the new UID to the list
		uidList.push(cards_parsed[i].uid);

		// Convert the card into a slimmer CardLike object (ignores custom cards)
		cards_parsed[i] = cardManager.parse.toCardLike(cards_parsed[i]);
	}

	// Push the new cards to the user's card_inventory
	await userData_update(userID, { $push: { card_inventory: { $each: cards_parsed } } });

	// Add the new cards' UIDs to the given card array
	cards.forEach((card, idx) => (card.uid = `${cards_parsed[idx].uid}`));
	return;
}

/** @param {string} userID @param {string | string[]} uids */
async function inventory_remove(userID, uids) {
	// Create an array if only a single card UID was passed
	if (!uids) return;
	if (!Array.isArray(uids)) uids = [uids];

	// Send a pull request to Mongo
	await userData_update(userID, { $pull: { card_inventory: { uid: { $in: uids } } } });
	return;
}

/** @param {string} userID */
async function inventory_update(userID, card) {
	await userData_update({ _id: userID, "card_inventory.uid": card.uid }, { $set: { "card_inventory.$": card } });
	return;
}

/** @param {string} userID */
async function inventory_sell(userID, cards) {
	// Create an array if only a single card was passed
	if (!cards) return;
	if (!Array.isArray(cards)) cards = [cards];

	// Check if the user still has the cards in their card_inventory
	if (
		!inventory_exists(
			userID,
			cards.map(card => card.uid)
		)
	)
		return false;

	await Promise.all([
		// Update the user's balance
		userData_update(userID, { $inc: { balance: _jsT.sum(cards.map(c => c.sellPrice)) } }),
		// Remove the cards from the user's card_inventory
		inventory_remove(
			userID,
			cards.map(card => card.uid)
		)
	]);
	return true;
}

/** @param {string} userID */
async function inventory_stats(userID) {
	// Get the name of each card category
	let categories = Object.keys(cardManager.cards.base);

	/// Count how many cards the user has out of each category
	// prettier-ignore
	let cards_user_count = await Promise.all(categories.map(async category => {
		// Get the global IDs for every card in the category
		let _globalIDs = cardManager.cards.globalIDs.base.get(category);

		let pipeline = [
			{ $unwind: "$card_inventory" },
			{ $match: { _id: userID, "card_inventory.globalID": { $in: _globalIDs } } },
			{
				$group: {
					_id: "$_id",
					card_inventory: { $sum: { $size: { $filter: { input: ["$card_inventory.globalID"], cond: "$$this" } } } }
				}
			}
		];

		let userData = (await models.user.aggregate(pipeline))[0];
		return { category, has: userData?.card_inventory || 0, outOf: _globalIDs.length };
	}));

	return cards_user_count;
}

//! UserData -> Badges
/** @param {string} userID */
async function badges_add(userID, badges) {
	// Create an array if only a single badge object was passed
	// filtering out invalid badges in the process
	if (!badges) return;
	if (!Array.isArray(badges)) badges = [badges].filter(badges => badges?.id);

	// Push the new badges to the user's badge array
	return await userData_update(userID, { $push: { badges: { $each: badges } } });
}

/// -- Charms --
/** @param {string} userID @param {CharmType} charmType  */
async function charms_get(userID, charmType) {
	let userData = await userData_fetch(userID, { type: "charm", lean: false });

	let charm = userData.charms.get(charmType);
	if (!charm) return null;
	if (Date.now() >= charm.expiration) return null;

	return charm;
}

/** @param {string} userID */
async function charms_set(userID, charms) {
	// Create an array if only a single charm object was passed
	// filtering out invalid charms in the process
	if (!charms) return;
	if (!Array.isArray(charms)) charms = [charms].filter(charms => charms?.id);

	let userData = await userData_fetch(userID, { type: "charm", lean: false });
	let _charms = userData.charms || new Map();

	for (let charm of charms) _charms.set(charm.type, charm);

	// Update the user's charm map
	return await userData_update(userID, { charms: _charms });
}

//! UserData -> Cooldowns
/** @param {string} userID @param {CooldownType} cooldownType */
async function cooldowns_check(userID, cooldownType) {}

/** @param {string} userID @param {CooldownType} cooldownType */
async function cooldowns_set(userID, cooldownType) {}

//! UserData -> Reminders
async function reminders_upsert(userID, reminderType) {
	let userData = await userData_fetch(userID, { type: "reminder" });

	let reminder = userData.reminders.find(r => r.type === reminderType);
	if (reminder) return reminder;

	reminder ||= { type: reminderType, mode: "channel", enabled: false };
}

/** @param {string} userID @param {CooldownType} reminderType */
async function reminders_set(userID, reminderType) {}

/** @param {string} userID @param {CooldownType} reminderType */
async function reminders_toggle(userID, reminderType) {
	let userData = await userData_fetch(userID, { type: "reminder" });

	let reminder = userData.reminders.find(r => r.type === reminderType);
	let reminder_enabled = reminder?.enabled || false;

	// prettier-ignore
	if (reminder) await userData_update(
		{ _id: userID, "reminders.type": reminderType },
		{ $set: { "reminders.$": { type: reminderType, enabled: !reminder_enabled, timestamp: reminder.timestamp || null } } }
	);
	else await userData_update(
		userID,
		{ $addToSet: { "reminders": { type: reminderType, enabled: !reminder_enabled, timestamp: null } } }
	);

	return !reminder_enabled;
}

/** @param {string} userID @param {CooldownType} reminderType @param {ReminderNotificationMode} mode */
async function reminders_setMode(userID, reminderType, mode) {
	await userData_update({ _id: userID, "reminders.type": reminderType }, { $set: { "card_inventory.$.mode": mode } });
	return;
}

//! UserData -> Quest
/** @param {string} userID @param {number} amount */
async function quest_progress_increment_inventory(userID, amount) {}

/** @param {string} userID @param {number} amount */
async function quest_progress_increment_balance(userID, amount) {}

/** @param {string} userID @param {number} amount */
async function quest_progress_increment_xp(userID, amount) {}

//! UserData -> Statistics
/** @param {string | {_id: string}} filter userID or filter @param {{}} query */
async function statistics_update(filter, query) {}

/** @param {string} userID @param {number} amount */
async function statistics_increment_commandsUsed(userID, amount) {}

/** @param {string} userID @param {number} amount */
async function statistics_increment_carrots(userID, amount) {}
/** @param {string} userID @param {number} amount */
async function statistics_increment_ribbons(userID, amount) {}

module.exports = {
	models,

	count: userData_count,
	exists: userData_exists,
	insert: userData_insert,
	fetch: userData_fetch,
	update: userData_update

	/* xp: {
		increment: xp_increment,
		levelUp: xp_levelUp
	},

	currency: {
		increment: currency_increment
	},

	inventory: {
		count: inventory_count,
		exists: inventory_exists,
		has: inventory_has,
		get: inventory_get,
		add: inventory_add,
		remove: inventory_remove,
		update: inventory_update,
		sell: inventory_sell,
		stats: inventory_stats,

		vault: {
			get: inventory_get_vault
		}
	},

	badges: {
		add: badges_add
	},

	charms: {
		get: charms_get,
		set: charms_set
	},

	cooldowns: {
		check: cooldowns_check,
		set: cooldowns_set
	},

	reminders: {
		set: reminders_set,
		setMode: reminders_setMode,
		toggle: reminders_toggle
	},

	quest: {
		progress: {
			increment: {
				inventory: quest_progress_increment_inventory,
				balance: quest_progress_increment_balance,
				xp: quest_progress_increment_xp
			}
		}
	},

	statistics: {
		update: statistics_update,
		increment: {
			commandsUsed: statistics_increment_commandsUsed
		}
	} */
};
