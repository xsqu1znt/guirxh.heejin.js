/** @typedef {"card_pack"|"badge"|"charm"} ItemType */
const ItemType = { card_pack: "card_pack", badge: "badge", charm: "charm" };

const { userManager } = require("./mongo/index");
const _jst = require("./jsTools/_jsT");

const items = {
	card_packs: require("../items/card_packs.json"),
	badges: require("../items/badges.json"),
	charms: require("../items/charms.json")
};

const config = {
	bot: require("../configs/config_bot.json")
};

/** @param {string} id */
function getItem(id) {
	let item = items.card_packs.find(c => c.id === id);
	let itemType = ItemType.card_pack;

	if (!item) {
		item = items.badges.find(b => b.id === id);
		itemType = ItemType.badge;
	}

	if (!item) {
		for (let charm of items.charms) {
			let _item = charm.charms.find(c => c.id === id);
			if (_item) item = item;
		}

		itemType = ItemType.charm;
	}

	return { item: item ? structuredClone(item) : null, type: item ? itemType : null };
}

/** @param {string} id @param {ItemType} itemType */
async function buyItem(id, itemType) {
	// prettier-ignore
	switch (itemType) {
		case ItemType.card_pack: return;
		
		case ItemType.badge: return await badge_buy(userID, id);
		
		case ItemType.charm: return await charm_buy(userID, id);
    }
}

/// -- Card Packs --

/// -- Badges --
async function badge_buy(userID, badgeID) {
	let { item: badge, type: _itemType } = getItem(badgeID);
	if (!_itemType !== ItemType.badge) return null;

	let userData = await userManager.fetch(userID, { type: "balance" });
	if (badge.price > userData.balance) return null;

	await Promise.all([
		// Subtract the badge's price from the user's balance
		userManager.balance.increment(userID, -badge.price, "carrot"),
		// Give the badge to the user
		userManager.badges.add(userID, badge)
	]);

	return badge;
}

/// -- Charms --
async function charm_buy(userID, charmID) {
	let { item: charm, type: _itemType } = getItem(charmID);
	if (!_itemType !== ItemType.charm) return null;

	let userData = await userManager.fetch(userID, { type: "balance" });
	if (charm.price > userData.balance) return null;

	// Set the charm's expiration date
	charm.data.expiration = _jst.parseTime(charm.data.duration, { fromNow: true });

	await Promise.all([
		// Subtract the badge's price from the user's balance
		userManager.balance.increment(userID, -charm.price, "carrot"),
		// Give the badge to the user
		userManager.charms.add(userID, charm)
	]);

	return charm;
}

module.exports = {
	items: {
		card_packs: {
			general: items.card_packs,
			setIDs: _jst.unique(items.card_packs.map(pack => pack.setID))
		},

		badges: {
			general: items.badges,
			setIDs: _jst.unique(items.badges.map(b => b.setID))
		},

		charms: {
			general: items.charms,
			setIDs: _jst.unique(items.charms.map(c => c.setID))
		}
	},

	getItem,
	buyItem
};
