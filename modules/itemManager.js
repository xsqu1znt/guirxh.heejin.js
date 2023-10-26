/** @typedef {"card_pack"|"badge"|"charm"} ItemType */
const ItemType = { card_pack: "card_pack", badge: "badge", charm: "charm" };

const { userManager } = require("./mongo/index");
const cardManager = require("./cardManager");
const _jst = require("./jsTools/_jsT");

const items = {
	cardPacks: require("../items/itemPack_cards.json"),
	badges: require("../items/badges.json"),
	charms: require("../items/charms.json")
};

const config = {
	bot: require("../configs/config_bot.json")
};

/** @param {string} id */
function getItem(id) {
	let item = items.cardPacks.find(c => c.id === id);
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
function cardPack_toString_setEntry(setID) {
	let cardPack = items.cardPacks.filter(pack => pack.setID === setID);
	if (!cardPack.length) return "n/a";

	let cardPack_first = cardPack.slice(-1)[0];

	return "> **`$CATEGORY`** `🗣️ $SET_ID` `📁 $COUNT` `$EMOJI` $DESCRIPTION"
		.replace("$SET_ID", cardPack_first.setID)
		.replace("$COUNT", cardPack.length >= 10 ? cardPack.length : `0${cardPack.length}`)
		.replace("$CATEGORY", cardPack_first.category)
		.replace("$EMOJI", cardPack_first.emoji)
		.replace("$DESCRIPTION", cardPack_first.description);
}

function cardPack_toString_shopEntry(packID) {
	let cardPack = items.cardPacks.find(pack => pack.id === packID);
	if (!cardPack) return "n/a";

	let cards_f = cardPack.content.sets.map(set => cardManager.toString.cardPackEntry(set.id, set.chance));

	return "`$ID` `🗣️ $SET_ID` **$SET** $NAME `🃏 $CARD_COUNT` `$PRICE`\n$CARDS"
		.replace("$ID", cardPack.id)
		.replace("$SET_ID", cardPack.setID)
		.replace("$SET", cardPack.set)
		.replace("$NAME", cardPack.name)
		.replace("$CARD_COUNT", cardPack.content.count)
		.replace("$PRICE", `${config.bot.emojis.currency_1.EMOJI} ${cardPack.price}`)
		.replace("$CARDS", cards_f.join("\n"));
}

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

function badge_toString_setEntry(setID) {
	let badges = items.badges.filter(b => b.setID === setID);
	if (!badges.length) return "n/a";

	let badges_first = badges.slice(-1)[0];

	// return "> $CATEGORY $SET_ID $COUNT $EMOJI $SET"
	return "> **`$CATEGORY`** `🗣️ $SET_ID` `📁 $COUNT` $EMOJI $DESCRIPTION"
		.replace("$CATEGORY", badges_first.category)
		.replace("$SET_ID", badges_first.setID)
		.replace("$COUNT", badges.length >= 10 ? badges.length : `0${badges.length}`)
		.replace("$EMOJI", badges_first?.customEmoji || `\`${badges_first.emoji}\``)
		.replace("$DESCRIPTION", badges_first.description);
}

function badge_toString_shopEntry(badgeID) {
	let badge = items.badges.find(b => b.id === badgeID);
	if (!badge) return "n/a";

	return "`$ID` `🗣️ $SET_ID` $EMOJI **$SET** *`$CATEGORY`* $NAME `$PRICE`"
		.replace("$ID", badge.id)
		.replace("$SET_ID", badge.setID)
		.replace("$EMOJI", badge?.customEmoji || `\`${badge.emoji}\``)
		.replace("$SET", badge.set)
		.replace("$CATEGORY", badge.category)
		.replace("$NAME", badge.name)
		.replace("$PRICE", `${config.bot.emojis.currency_1.EMOJI} ${badge.price}`);
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
		cardPacks: {
			general: items.cardPacks,
			setIDs: { general: _jst.unique(items.cardPacks.map(pack => pack.setID)) }
		},

		badges: {
			general: items.badges,
			setIDs: { general: _jst.unique(items.badges.map(b => b.setID)) }
		},

		charms: {
			general: items.charms,
			setIDs: { general: _jst.unique(items.charms.map(c => c.setID)) }
		}
	},

	toString: {
		cardPacks: {
			setEntry: cardPack_toString_setEntry,
			shopEntry: cardPack_toString_shopEntry
		},
		badges: {
			setEntry: badge_toString_setEntry,
			shopEntry: badge_toString_shopEntry
		}
	},

	getItem,
	buyItem
};
