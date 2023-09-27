const userManager = require("./uM_index");
const uM_statistics = require("./uM_statistics");
const _jsT = require("../jsTools/_jsT");
const _aJM = require("../asyncJobManager");

const config = { player: require("../../configs/config_player.json") };

/// XP
/**
 * @param {string} userID
 * @param {number} amount use a negative number to subtract
 * @param {import("./uM_statistics").StatisticType} statType */
async function xp_increment(userID, amount, statType = null) {
	let job = new _aJM.Job();

	job.add(userManager.update(userID, { $inc: { xp: amount } }));

	// prettier-ignore
	switch (statType) {
        case "drop": job.add(uM_statistics.level.xp.increment(userID, amount, "drop")); break;
        case "random": job.add(uM_statistics.level.xp.increment(userID, amount, "random")); break;
		default: break;
    }

	await job.await();
}

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

	const levelUp = () => {
		if (userData.level >= config.player.xp.user.LEVEL_MAX) return;

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
		await userManager.update(userID, {
			level: userData.level,
			xp: userData.xp,
			xp_for_next_level: userData.xp_for_next
		});

	return session;
}

module.exports = {
	xp: {
		increment: xp_increment,
		levelUp: xp_levelUp
	}
};
