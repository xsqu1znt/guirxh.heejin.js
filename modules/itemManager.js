/** @typedef {"card_pack"|"badge"|"boost"} ItemType */

const _jst = require("./jsTools/_jsT");

const items = {
	card_packs: require("../items/card_packs.json"),
	badges: require("../items/badges.json"),
	boosts: require("../items/boosts.json")
};

const config = {
	bot: require("../configs/config_bot.json")
};

/** @param {string} id */
function get(id) {
	let item = items.card_packs.find(c => c.id === id);
	let itemType = "card_pack";

	if (!item) {
		item = items.badges.find(b => b.id === id);
		itemType = "badge";
	}

	if (!item) {
		item = items.boosts.find(b => b.id === id);
		itemType = "boost";
	}

	return { item: item ? structuredClone(item) : null, type: item ? itemType : "n/a" };
}

/** @param {string} id @param {ItemType} itemType */
function buy(id, itemType) {
	// prettier-ignore
	switch (itemType) {
        case "card_pack": return;
        case "badge": return;
        case "boost": return;
    }
}
