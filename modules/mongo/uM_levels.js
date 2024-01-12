const userManager = require("./uM_index");
const uM_statistics = require("./uM_statistics");

const config = { player: require("../../configs/config_player.json") };

/** @param {string} userID */
async function xp_levelUp(userID) {
	// Fetch the user from Mongo
	let userData = await userManager.fetch(userID, { type: "xp" });

	// Used to keep track of what happened
	let session = {
		leveled: false,
		levels_gained: 0,

		/** @type {number} */
		level_current: userData.level
	};

	// Ignore if the user's at max level
	if (userData.level >= config.player.xp.user.LEVEL_MAX) return session;

	const levelUp = () => {
		if (userData.level >= config.player.xp.user.LEVEL_MAX) return;

		if (userData.xp >= userData.xp_for_next_level) {
			// Subtract the required XP to level up from the user
			userData.xp = Math.floor(userData.xp - userData.xp_for_next_level) || 0;

			// Increase the user's level
			userData.level++;

			// Calculate the XP required for the next level
			userData.xp_for_next_level = Math.floor(userData.level * config.player.xp.user.LEVEL_XP_MULTIPLIER);

			/// Update session data
			session.leveled = true;
			session.levels_gained++;
			session.level_current++;
		}
	};

	// Level up the user until they can't anymore
	while (userData.xp >= userData.xp_for_next_level && userData.level < config.player.xp.user.LEVEL_MAX) levelUp();

	// prettier-ignore
	// Push the update to Mongo
	if (session.leveled) await userManager.update(userID, {
		level: userData.level,
		xp: userData.level === config.player.xp.user.LEVEL_MAX ? 0 : userData.xp,
		xp_for_next_level: userData.level === config.player.xp.user.LEVEL_MAX ? 0 : userData.xp_for_next_level
	});

	return session;
}

/**
 * @param {string} userID
 * @param {number} amount use a negative number to subtract
 * @param {import("./uM_statistics").StatisticType} statType */
async function increment_xp(userID, amount, statType) {
	// Fetch the user from Mongo
	let userData = await userManager.fetch(userID, { type: "xp" });

	// Ignore if the user's at max level
	if (userData.level >= config.player.xp.user.LEVEL_MAX) return;

	await Promise.all([
		userManager.update(userID, { $inc: { xp: amount } }),
		uM_statistics.push.xp(userID, amount, statType)
	]);
}

module.exports = {
	increment: { xp: increment_xp },
	xp: { levelUp: xp_levelUp }
};
