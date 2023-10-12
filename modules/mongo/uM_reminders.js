/** @typedef {"dm"|"channel"} ReminderNotificationMode */

const userManager = require("./uM_index");
const _jsT = require("../jsTools/_jsT");

const config = { player: require("../../configs/config_player.json") };

/** @param {string} userID @param {import("./uM_cooldowns").CooldownType} reminderType */
async function upsert(userID, reminderType) {
	// Fetch the user's data from Mongo
	let userData = await userManager.fetch(userID, { type: "reminder" });

	// Check if the reminder already exists
	/** @type {UserReminder} */
	let reminder = userData.reminders.find(r => r.type === reminderType);
	if (reminder) return reminder;

	/// Add a new reminder to the user's data
	reminder = new UserReminder(reminderType, "channel", false);
	await userManager.update(userID, { $addToSet: { [`reminders.${reminderType}`]: { ...reminder } } });

	return reminder;
}

/** @param {string} userID @param {import("./uM_cooldowns").CooldownType} reminderType */
async function toggle(userID, reminderType) {
	let reminder = await upsert(userID, reminderType);
	reminder.enabled = !reminder.enabled;

	// prettier-ignore
	await userData_update(
        { _id: userID, "reminders.type": reminderType },
        { $set: { "reminders.$.enabled": reminder.enabled } }
    );

	return reminder;
}

/** @param {string} userID @param {import("./uM_cooldowns").CooldownType} reminderType @param {string} channelID  */
async function set(userID, reminderType, channelID) {
	let reminder = await upsert(userID, reminderType);

	reminder.channelID = channelID;

	// prettier-ignore
	await userData_update(
        { _id: userID, "reminders.type": reminderType },
        { $set: { "reminders.$": reminder } }
    );

	return reminder;
}

/** @param {string} userID @param {import("./uM_cooldowns").CooldownType} reminderType @param {ReminderNotificationMode} mode */
async function setMode(userID, reminderType, mode) {
	let reminder = await upsert(userID, reminderType);

	// prettier-ignore
	await userData_update(
        { _id: userID, "reminders.type": reminderType },
        { $set: { "reminders.$.mode": mode } }
    );

	return reminder;
}

/// Classes
class UserReminder {
	/** @param {ReminderType} reminderType @param {ReminderNotificationMode} mode @param {boolean} enabled */
	constructor(reminderType, mode, enabled) {
		let time = _jsT.parseTime(config.player.cooldowns[reminderType.toUpperCase()]);
		let isLongDuration = time > _jsT.parseTime(config.player.COOLDOWN_LONG_THRESHOLD);

		this.type = reminderType;
		this.timestamp = _jsT.parseTime(time, { fromNow: true });
		this.channelID = "";
		this.mode = mode || isLongDuration ? "dm" : "channel";
		this.enabled = enabled || false;
	}
}

module.exports = { UserReminder, upsert, toggle, set, setMode };
