/** @typedef {"card"|"cardPack"|"badge"|"charm"} ItemType */
const ItemType = { card: "card", cardPack: "cardPack", badge: "badge", charm: "charm" };

const { BetterEmbed } = require("./discordTools/_dsT");
const { userManager } = require("./mongo/index");
const cardManager = require("./cardManager");
const dropManager = require("./dropManager");
const _jsT = require("./jsTools/_jsT");

const items = {
	cardPacks: require("../items/itemPack_cards.json"),
	badges: require("../items/badges.json"),
	charms: require("../items/charms.json")
};

const config = { bot: require("../configs/config_bot.json") };

const emojis = {
	currency_1: config.bot.emojis.currency_1.EMOJI,
	currency_2: config.bot.emojis.currency_2.EMOJI
};

/** @param {string} id */
function getItem(id) {
	id = id.toLowerCase();

	// prettier-ignore
	let item, itemType = ItemType.card, itemParent;

	// Test for cards
	if (!item) {
		item = cardManager.get.fromShop(id);
		itemType = ItemType.card;
	}

	// Test for card packs
	if (!item) {
		item = items.cardPacks.find(pack => pack.id.toLowerCase() === id);
		itemType = ItemType.cardPack;
	}

	// Test for badges
	if (!item) {
		item = items.badges.find(b => b.id.toLowerCase() === id);
		itemType = ItemType.badge;
	}

	// Test for charms
	if (!item) {
		for (let _charm of items.charms) {
			let _item = _charm.items.find(c => c.id.toLowerCase() === id);

			if (_item) {
				item = _item;
				itemType = ItemType.charm;
				itemParent = _charm;
				break;
			}
		}
	}

	return { item: item ? structuredClone(item) : null, type: item ? itemType : null, itemParent: itemParent || null };
}

/** @param {string} id */
async function buyItem(user, id) {
	id = id.toLowerCase();

	// prettier-ignore
	let { item, type } = getItem(id);

	// prettier-ignore
	switch (type) {
		case ItemType.card:
			item = await card_buy(user.id, id);
			if (!item) return null;

			// Create the embed :: { Purchase Failed }
			if (!item.card) return { embed: new BetterEmbed({
				author: "⛔ Purchase failed",
				description: `You do not have enough \`${item.isSpecial ? emojis.currency_2 : emojis.currency_1}\` to buy this card`,
				footer: { text: `balance: ${item.isSpecial ? emojis.currency_2 : emojis.currency_1} ${item.balance}` }
			}) };

			// Create the embed :: { Shop Buy - Card }
			let embed_card = new BetterEmbed({
				author: { text: "$USERNAME | buy", iconURL: true, user },
				description: `You bought **\`🃏 ${item.card.single} - ${item.card.name}\`**:\n> ${cardManager.toString.basic(item.card)}`,
				footer: { text: `balance: ${item.isSpecial ? emojis.currency_2 : emojis.currency_1} ${item.balance}` }
			});

			return { item: item.card, type, embed: embed_card };

		case ItemType.cardPack:
			item = await cardPack_buy(user.id, id);
			if (!item) return null;

			// Create the embed :: { Purchase Failed }
			if (!item.cards || !item.cards.length) return { embed: new BetterEmbed({
				author: "⛔ Purchase failed",
				description: `You do not have enough \`${emojis.currency_1}\` to buy this card pack`,
				footer: { text: `balance: ${emojis.currency_1} ${item.balance}` }
			}) };

			// Create the embed :: { Shop Buy - Card Pack }
			let embed_cardPack = new BetterEmbed({
				author: { text: "$USERNAME | buy", iconURL: true, user },
				description: `You bought **\`📦 ${item.name}\`** and got:\n${item.cards_f.join("\n")}`,
				footer: { text: `balance: ${emojis.currency_1} ${item.balance}` },
				imageURL: item.card_imageURL
			});

			return { item: item.cards, type, embed: embed_cardPack };
		
		case ItemType.badge:
			item = await badge_buy(user.id, id);
			if (!item) return null;

			// Create the embed :: { Purchase Failed - Already Owned }
			if (item.alreadyOwned) return { embed: new BetterEmbed({
				author: "⛔ Purchase failed",
				description: `You already own this badge`,
				footer: { text: `balance: ${emojis.currency_1} ${item.balance}` }
			}) };

			// Create the embed :: { Purchase Failed }
			if (!item.badge) return { embed: new BetterEmbed({
				author: "⛔ Purchase failed",
				description: `You do not have enough \`${emojis.currency_1}\` to buy this badge`,
				footer: { text: `balance: ${emojis.currency_1} ${item.balance}` }
			}) };

			// Create the embed :: { Shop Buy - Badge }
			let embed_badge = new BetterEmbed({
				author: { text: "$USERNAME | buy", iconURL: true, user },
				description: `You bought **\`📛 ${item.badge.name}\`**:\n> ${badge_toString_basic(item.badge.id)}`,
				footer: { text: `balance: ${emojis.currency_1} ${item.balance}` }
			});

			return { item: item.badge, type, embed: embed_badge };
		
		case ItemType.charm:
			item = await charm_buy(user.id, id);
			if (!item) return null;

			// Create the embed :: { Purchase Failed - Already Owned }
			if (item.alreadyOwned) return { embed: new BetterEmbed({
				author: "⛔ Purchase failed",
				description: `You already own this charm and it is still active`,
				footer: { text: `balance: ${emojis.currency_1} ${item.balance}` }
			}) };

			// Create the embed :: { Purchase Failed }
			if (!item.charm) return { embed: new BetterEmbed({
				author: "⛔ Purchase failed",
				description: `You do not have enough \`${emojis.currency_1}\` to buy this charm`,
				footer: { text: `balance: ${emojis.currency_1} ${item.balance}` }
			}) };

			// Create the embed :: { Shop Buy - Charm }
			let embed_charm = new BetterEmbed({
				author: { text: "$USERNAME | buy", iconURL: true, user },
				description: `You bought **\`${item.charm.emoji} ${item.charm.name}\`**:\n> ${charm_toString_basic(item.charm.id)}`,
				footer: { text: `balance: ${emojis.currency_1} ${item.balance}` }
			});

			return { item: item.charm, type, embed: embed_charm };
	}

	return { item, type };
}

/* - - - - - { Cards } - - - - - */
async function card_buy(userID, globalID) {
	let card = cardManager.get.fromShop(globalID);
	if (!card) return null;

	// Check if it's a special card
	let isSpecial = cardManager.cards.shop.special.find(c => c.globalID === card.globalID) ? true : false;

	/// Check if the user has enough to complete the purchase
	let userData = await userManager.fetch(userID, { type: "balance" });
	let user_balance = isSpecial ? userData.ribbons : userData.balance;
	if (card.price > user_balance) return { isSpecial, balance: user_balance };

	await Promise.all([
		// Subtract the card pack's price from the user's balance
		userManager.balance.increment(userID, -card.price, isSpecial ? "ribbon" : "carrot"),
		// Give the cards to the user
		userManager.inventory.add(userID, card)
	]);

	return { card, isSpecial, balance: user_balance - (card.price || 0) };
}

/* - - - - - { Card Packs } - - - - - */
async function cardPack_buy(userID, packID) {
	let { item: cardPack, type: _itemType } = getItem(packID);
	if (!cardPack || _itemType !== ItemType.cardPack) return null;

	/// Check if the user has enough to complete the purchase
	let userData = await userManager.fetch(userID, { type: "balance" });
	if (cardPack.price > userData.balance) return { balance: userData.balance };

	// Choose which cards the user gets
	let cards = await dropManager.drop(userID, "cardPack", { count: cardPack.content.count, sets: cardPack.content.sets });

	await Promise.all([
		// Subtract the card pack's price from the user's balance
		userManager.balance.increment(userID, -cardPack.price, "carrot"),
		// Give the cards to the user
		userManager.inventory.add(userID, cards)
	]);

	// prettier-ignore
	// Check which cards the user already has
	let cards_isDupe = await userManager.inventory.has(userID, cards.map(c => c.globalID));

	// Format the cards into strings
	let cards_f = cards.map((c, idx) =>
		cardManager.toString.inventoryEntry(c, { simplify: true, duplicate: cards_isDupe[idx] })
	);

	// prettier-ignore
	return {
		cards, cards_f, card_imageURL: cards.slice(-1)[0]?.imageURL,
		name: cardPack.name, balance: userData.balance - (cardPack.price || 0)
	};
}

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

	let cards_f = cardPack.content.sets.map(set => cardManager.toString.cardPackEntry(set.id, set.rarity));

	return "`$ID` `🗣️ $SET_ID` **$SET** $NAME `🃏 $CARD_COUNT` `$PRICE`\n$CARDS"
		.replace("$ID", cardPack.id)
		.replace("$SET_ID", cardPack.setID)
		.replace("$SET", cardPack.set)
		.replace("$NAME", cardPack.name)
		.replace("$CARD_COUNT", cardPack.content.count)
		.replace("$PRICE", `${config.bot.emojis.currency_1.EMOJI} ${cardPack.price}`)
		.replace("$CARDS", cards_f.join("\n"));
}

/* - - - - - { Badges } - - - - - */
async function badge_buy(userID, badgeID) {
	let { item: badge, type: _itemType } = getItem(badgeID);
	if (!badge || _itemType !== ItemType.badge) return null;

	// Check if the user already owns the badge
	if (await userManager.badges.has(badgeID)) return { alreadyOwned: true };

	/// Check if the user has enough to complete the purchase
	let userData = await userManager.fetch(userID, { type: "balance" });
	if (badge.price > userData.balance) return { balance: userData.balance };

	await Promise.all([
		// Subtract the badge's price from the user's balance
		userManager.balance.increment(userID, -badge.price, "carrot"),
		// Give the badge to the user
		userManager.badges.add(userID, badge)
	]);

	return { badge, balance: userData.balance - (badge.price || 0) };
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

/* - - - - - { Charms } - - - - - */
async function charm_buy(userID, charmID) {
	let { item: charm, type: _itemType } = getItem(charmID);
	if (!badge || _itemType !== ItemType.charm) return null;

	/// Check if the user has enough to complete the purchase
	let userData = await userManager.fetch(userID, { type: "balance" });
	if (charm.price > userData.balance) return { balance: userData.balance };

	// Set the charm's expiration date
	charm.data.expiration = _jsT.parseTime(charm.data.duration, { fromNow: true });

	await Promise.all([
		// Subtract the badge's price from the user's balance
		userManager.balance.increment(userID, -charm.price, "carrot"),
		// Give the badge to the user
		userManager.charms.set(userID, charm)
	]);

	return charm;
}

function charm_toString_basic(charmID) {
	let { item: charm, type: _itemType } = getItem(charmID);
	if (!_itemType !== ItemType.charm) return null;

	return "`$ID` `$EMOJI` **$NAME** `🌟 $POWER%` `⏰ $DURATION`"
		.replace("ID", charm.id)
		.replace("EMOJI", charm.emoji)
		.replace("NAME", charm.name)
		.replace("POWER", charm.power)
		.replace("DURATION", _jsT.eta({ then: charm.duration }).substring(3));
}

function badge_toString_setEntry(setID) {
	let charms = items.charms.filter(c => c.setID === setID);
	if (!charms.length) return "n/a";

	let charms_first = charms.slice(-1)[0];

	return "> **`$CATEGORY`** `🗣️ $SET_ID` `📁 $COUNT` `$EMOJI` $DESCRIPTION"
		.replace("$CATEGORY", charms_first.category)
		.replace("$SET_ID", charms_first.setID)
		.replace("$COUNT", charms.length >= 10 ? charms.length : `0${charms.length}`)
		.replace("$EMOJI", charms_first.emoji)
		.replace("$DESCRIPTION", charms_first.description);
}

function charm_toString_shopEntry(charmID) {
	let { item: charm, type: _itemType, itemParent: charmBase } = getItem(charmID);
	if (!_itemType !== ItemType.charm) return null;

	return "`$ID` `🗣️ $SET_ID` `$EMOJI` **$TYPE** $NAME $PRICE"
		.replace("ID", charm.id)
		.replace("EMOJI", charmBase.emoji)
		.replace("TYPE", charBase.type)
		.replace("NAME", charm.name)
		.replace("POWER", charm.power)
		.replace("DURATION", _jsT.eta({ then: charm.duration }).substring(3));
}

module.exports = {
	items: {
		cardPacks: {
			general: items.cardPacks,
			setIDs: { general: _jsT.unique(items.cardPacks.map(pack => pack.setID)) }
		},

		badges: {
			general: items.badges,
			setIDs: { general: _jsT.unique(items.badges.map(b => b.setID)) }
		},

		charms: {
			general: items.charms,
			setIDs: { general: _jsT.unique(items.charms.map(c => c.setID)) }
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
		},

		charms: {
			basic: charm_toString_basic,
			setEntry: charm_toString_setEntry,
			shopEntry: charm_toString_shopEntry
		}
	},

	getItem,
	buyItem
};
