/** @typedef {"dupeRepel"} CharmType */

const userManager = require("./uM_index");
const _jsT = require("../jsTools/_jsT");

/** @param {string} userID @param {CharmType} charmType */
async function get(userID, charmType) {
	let userData = await userManager.fetch(userID, { type: "charm", lean: false });
	if (!userData.charms) return null;

	let charm = userData.charms.get(charmType);
	if (!charm) return null;

	if (Date.now() >= charm.expiration) return null;

	return charm;
}

/** @param {string} userID */
async function clean(userID) {
	let userData = await userManager.fetch(userID, { type: "charms" });
	if (!userData.charms) return null;

	let cleaned = false;

	for (let i = 0; i < userData.charms.length; i++) {
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
	charms = _jsT.isArray(charms).filter(c => c?.id);

	let userData = await userManager.fetch(userID, { type: "charm", lean: false });
	let _charms = userData.charms || new Map();

	for (let charm of charms) _charms.set(charm.type, charm);

	// Update the user's charms
	return await userManager.update(userID, { charms: _charms });
}

module.exports = { get, clean, set };
