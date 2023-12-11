/** @typedef {"dm"|"channel"} ReminderNotificationMode */

const userManager = require("./uM_index");
const jt = require("../jsTools");

const config = { player: require("../../configs/config_player.json") };

/** @param {string} userID @param {import("./uM_cooldowns").CooldownType} reminderType @param {string} channelID */
async function upsert(userID, reminderType, channelID) {
	// Fetch the user from Mongo
	let userData = await userManager.fetch(userID, { type: "reminder" });

	// Check if the reminder already exists
	/** @type {UserReminder} */
	let reminder = userData.reminders.find(r => r.type === reminderType);
	if (reminder) return { reminder: reminder, exists: true };

	/* - - - - - { Add a New Reminder } - - - - - */
	reminder = new UserReminder(reminderType, null, false, channelID);
	await userManager.update(userID, { $addToSet: { reminders: reminder } });

	return { reminder: reminder, exists: false };
}

/** @param {string} userID @param {import("./uM_cooldowns").CooldownType} reminderType */
async function toggle(userID, reminderType) {
	let { reminder } = await upsert(userID, reminderType);
	reminder.enabled = !reminder.enabled;

	// prettier-ignore
	await userManager.update(
        { _id: userID, "reminders.type": reminderType },
        { $set: { "reminders.$.enabled": reminder.enabled } }
    );

	return reminder;
}

/** @param {string} userID @param {import("./uM_cooldowns").CooldownType} reminderType @param {string} channelID */
async function set(userID, reminderType, channelID) {
	let { reminder, exists } = await upsert(userID, reminderType, channelID);
	if (!exists) return reminder;

	reminder.channelID = channelID;
	reminder.timestamp = jt.parseTime(config.player.cooldowns[reminderType.toUpperCase()], { fromNow: true });

	// prettier-ignore
	await userManager.update(
        { _id: userID, "reminders.type": reminderType },
        { $set: { "reminders.$": reminder } }
    );

	return reminder;
}

/** @param {string} userID @param {import("./uM_cooldowns").CooldownType} reminderType */
async function set0(userID, reminderType) {
	// Fetch the user from Mongo
	let userData = await userManager.fetch(userID, { type: "reminder" });

	// Get the reminder
	let reminder = userData.reminders.find(r => r.type === reminderType);
	if (!reminder) return;

	// Set the reminder's timestamp to 0
	reminder.timestamp = 0;

	// prettier-ignore
	await userManager.update(
        { _id: userID, "reminders.type": reminderType },
        { $set: { "reminders.$": reminder } }
    );
}

/** @param {string} userID @param {import("./uM_cooldowns").CooldownType} reminderType @param {ReminderNotificationMode} mode */
async function setMode(userID, reminderType, mode) {
	let { reminder } = await upsert(userID, reminderType);

	// prettier-ignore
	await userManager.update(
        { _id: userID, "reminders.type": reminderType },
        { $set: { "reminders.$.mode": mode } }
    );

	return reminder;
}

/// Classes
class UserReminder {
	/** @param {ReminderType} reminderType @param {ReminderNotificationMode} mode @param {boolean} enabled */
	constructor(reminderType, mode, enabled, channelID) {
		let time = jt.parseTime(config.player.cooldowns[reminderType.toUpperCase()]);
		let isLongDuration = time > jt.parseTime(config.player.COOLDOWN_LONG_THRESHOLD);

		this.type = reminderType;
		this.timestamp = jt.parseTime(time, { fromNow: true });
		this.channelID = channelID;
		this.mode = mode || isLongDuration ? "dm" : "channel";
		this.enabled = enabled || false;
	}
}

module.exports = { UserReminder, upsert, toggle, set, set0, setMode };
