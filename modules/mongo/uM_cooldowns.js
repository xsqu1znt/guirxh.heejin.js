/** @typedef {"daily"|"stage"|"random"|"drop_general"|"drop_weekly"|"drop_season"|"drop_event_1"|"drop_event_2"} CooldownType */

const userManager = require("./uM_index");
const _jsT = require("../jsTools/_jsT");

const config = { player: require("../../configs/config_player.json") };

/** @param {string} userID @param {CooldownType} cooldownType */
async function upsert(userID, cooldownType) {
	// Fetch the user's data from Mongo
	let userData = await userManager.fetch(userID, { type: "reminder" });

	// Check if the cooldown already exists
	/** @type {UserCooldown} */
	let cooldown = userData.cooldowns.find(r => r.type === cooldownType);
	if (cooldown) return cooldown;

	/// Add a new cooldown to the user's data
	cooldown = new UserCooldown(cooldownType);
	await userManager.update(userID, { $addToSet: { cooldowns: cooldown } });

	return cooldown;
}

/** @param {string} userID @param {CooldownType} cooldownType */
async function eta(userID, cooldownType) {
	let userData = await userManager.fetch(userID, { type: "reminder" });

	let cooldown_timestamp = userData.cooldowns.find(cd => cd.type === cooldownType)?.timestamp || 0;
	return _jsT.eta({ then: cooldown_timestamp, ignorePast: true });
}

/** @param {string} userID @param {CooldownType} cooldownType */
async function set(userID, cooldownType) {
	let cooldown = await upsert(userID, cooldownType);

	cooldown.timestamp = _jsT.parseTime(config.player.cooldowns[cooldownType.toUpperCase()], { fromNow: true });

	// prettier-ignore
	await userManager.update(
        { _id: userID, "cooldowns.type": cooldownType },
        { $set: { "cooldowns.$": cooldown } }
    );

	return cooldown;
}

/// Classes
class UserCooldown {
	/** @param {CooldownType} cooldownType */
	constructor(cooldownType) {
		this.type = cooldownType;
		this.timestamp = _jsT.parseTime(config.player.cooldowns[cooldownType.toUpperCase()], { fromNow: true });
	}
}

module.exports = { UserCooldown, upsert, eta, set };
