const userManager = require("./uM_index");
const _jsT = require("../jsTools/_jsT");

/** @param {string} userID */
async function add(userID, badges) {
	if (!badges) return;

	// Create an array if only a single badge object was passed
	badges = _jsT.isArray(badges).filter(b => b?.id);

	// Push the new badges to the user's badge array
	return await userManager.update(userID, { $push: { badges: { $each: badges } } });
}

async function remove(userID, badgeIDs) {
	if (!badgeIDs) return;

	// Create an array if only a single badge object was passed
	badgeIDs = _jsT.isArray(badgeIDs);

	// Send a pull request to Mongo
	await userManager.update(userID, { $pull: { "badges.id": { $in: badgeIDs } } });
}

module.exports = { add, remove };
