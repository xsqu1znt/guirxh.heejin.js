/** @typedef {"dupeRepel"} CharmType */

const userManager = require("./uM_index");
const _jsT = require("../jsTools/_jsT");

/** @param {string} userID @param {CharmType} charmType */
async function get(userID, charmType) {
	let userData = await userManager.fetch(userID, { type: "charm", lean: false });

	let charm = userData.charms.get(charmType);
	if (!charm) return null;
	if (Date.now() >= charm.expiration) return null;

	return charm;
}

/** @param {string} userID */
async function set(userID, charms) {
	if (!charms) return;

	// Create an array if only a single charm object was passed
	charms = _jsT.isArray(charms).filter(c => c?.id);

	let userData = await userManager.fetch(userID, { type: "charm", lean: false });
	let _charms = userData.charms || new Map();

	for (let charm of charms) _charms.set(charm.type, charm);

	// Update the user's charms
	return await userManager.update(userID, { charms: _charms });
}

module.exports = { get, set };
