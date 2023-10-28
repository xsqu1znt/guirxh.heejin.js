const userManager = require("./uM_index");
const _jsT = require("../jsTools/_jsT");

/** @param {string} userID @param {string|string[]} badgeIDs */
async function has(userID, badgeIDs) {
	if (!badgeIDs) return null;

	// Create an array if only a single card UID was passed
	badgeIDs = _jsT.isArray(badgeIDs);

	/// Check the user's badges for the specified badge IDs
	let pipeline = [
		{ $unwind: "$badges" },
		{ $match: { _id: userID, "badges.id": { $in: badgeIDs } } },
		{ $group: { _id: "$_id", badges: { $push: "$badges.id" } } }
	];

	let userData = (await userManager.models.user.aggregate(pipeline))[0];
	// prettier-ignore
	if (!userData || !userData?.badges?.length) {
		badgeIDs.fill(false); return badgeIDs;
	}

	// prettier-ignore
	for (let i = 0; i < badgeIDs.length; i++)
		if (userData.badges.includes(badgeIDs[i]))
			badgeIDs[i] = true;
		else
			badgeIDs[i] = false;

	return badgeIDs.length > 1 ? badgeIDs : badgeIDs[0];
}

/** @param {string} userID @param {Badge|Badge[]} badges */
async function add(userID, badges) {
	if (!badges) return;

	// Create an array if only a single badge object was passed
	badges = _jsT.isArray(badges).filter(b => b?.id);

	// Push the new badges to the user's badge array
	return await userManager.update(userID, { $push: { badges: { $each: badges } } });
}

/** @param {string} userID @param {string|string[]} badgeIDs */
async function remove(userID, badgeIDs) {
	if (!badgeIDs) return;

	// Create an array if only a single badge object was passed
	badgeIDs = _jsT.isArray(badgeIDs);

	// Send a pull request to Mongo
	await userManager.update(userID, { $pull: { "badges.id": { $in: badgeIDs } } });
}

module.exports = { has, add, remove };
