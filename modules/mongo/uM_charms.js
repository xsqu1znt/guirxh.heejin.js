/** @typedef {"dupeRepel"} CharmType */

const userManager = require("./uM_index");
const jt = require("../jsTools");

/** @param {string} userID @param {CharmType} charmType */
async function get(userID, charmType) {
	// Clean out expired charms and return active ones
	let charms = await clean(userID);
	if (!charms) return null;

	// Return the requested charm, if it exists
	return charms.find(c => c.type === charmType) || null;
}

/** @param {string} userID */
async function clean(userID) {
	let userData = await userManager.fetch(userID, { type: "charm", lean: false });
	if (!userData?.charms.size) return null;

	let cleaned = false;

	for (let i = 0; i < userData.charms.size; i++) {
		let _charm = userData.charms[i];

		if (_charm.expiration >= Date.now()) {
			userData.charms.delete(_charm.type);
			cleaned = true;
		}
	}

	if (cleaned) await userManager.update(userID, { charms: userData.charms });

	return userData.charms;
}

/** @param {string} userID @param {Charm[]} charms  */
async function set(userID, charms) {
	if (!charms || (Array.isArray(charms) && charms.filter(c => c?.id))) return;

	// Create an array if only a single charm object was passed
	charms = jt.isArray(charms).filter(c => c?.id);

	let userData = await userManager.fetch(userID, { type: "charm", lean: false });
	let _charms = userData.charms || new Map();

	for (let charm of charms) _charms.set(charm.type, charm);

	// Update the user's charms
	return await userManager.update(userID, { charms: _charms });
}

module.exports = { get, clean, set };
