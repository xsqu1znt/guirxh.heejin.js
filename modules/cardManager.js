// const { botSettings, userSettings, dropSettings, eventSettings, shopSettings } = require("../configs/heejinSettings.json");
/* const {
	shopSettings: { setsInStock: shopSetsInStock }
} = require("../configs/heejinSettings.json"); */

/** @typedef options_toStr_inventory
 * @property {boolean} favorite
 * @property {boolean} selected
 * @property {boolean} onTeam
 * @property {boolean} simplify
 * @property {boolean|number} duplicate */

/** @typedef options_get_random
 * @property {"all"|"general"} type
 * @property {{min:number, max:number}} level
 * @property {number} count */

const { markdown } = require("./discordTools/_dsT");
const _jsT = require("./jsTools/_jsT");
const logger = require("./logger");

const config_player = require("../configs/config_player.json");
const config_event = require("../configs/config_event.json");
const config_shop = require("../configs/config_shop.json");
const config_drop = require("../configs/config_drop.json");
const config_bot = require("../configs/config_bot.json");

const cards = {
	comn: require("../items/cards/cards_common.json"),
	uncn: require("../items/cards/cards_uncommon.json"),
	rare: require("../items/cards/cards_rare.json"),
	epic: require("../items/cards/cards_epic.json"),
	mint: require("../items/cards/cards_mint.json"),

	bday: require("../items/cards/cards_bday.json"),
	holi: require("../items/cards/cards_holiday.json"),

	evnt: [
		...require("../items/cards/cards_event1.json"),
		...require("../items/cards/cards_event2.json"),
		...require("../items/cards/cards_event3.json")
	],

	seas: require("../items/cards/cards_season.json"),
	shop: require("../items/cards/cards_shop.json"),
	cust: require("../items/cards/cards_custom.json")
};

const category_colors = {
	comn: "red",
	uncn: "yellow",
	rare: "green",
	epic: "blue",
	mint: "pink",
	bday: "red",
	holi: "yellow",
	evnt: "green",
	seas: "blue",
	shop: "pink",
	cust: "white"
};

const category_emojis = {
	comn: "🔴",
	uncn: "🟡",
	rare: "🟢",
	epic: "🔵",
	mint: "🟣",
	bday: "🟥",
	holi: "🟨",
	evnt: "🟩",
	seas: "🟦",
	shop: "🟪",
	cust: "⬜"
};

const cards_all = [].concat(...Object.values(cards));
const cards_general = [...cards.comn, ...cards.uncn, ...cards.rare, ...cards.epic, ...cards.mint];

const categories_general = Object.values(config_drop.chance).map(c => ({ ...c, rarity: c.CHANCE }));

/// Card categories
const category_names_base = Object.keys(cards);
const category_names_all = _jsT.unique(cards_all.map(c => c.category));

// prettier-ignore
const category_globalIDs_base = _jsT.toMap(Object.entries(cards), ([cat, c]) =>
	({ key: cat, value: c.map(c => c.globalID) })
);
// prettier-ignore
const category_globalIDs_all = _jsT.toMap(category_names_all, cat =>
	({ key: cat, value: cards_all.filter(c => c.category === cat).map(c => c.globalID) })
);

// Special charactors
const superscript = {
	numbers: ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"],
	dupe: "ᴰ ᵁ ᴾ ᴱ"
};

function recalculateStats(card) {
	let card_base = get_globalID(card.globalID);
	if (!card_base) {
		logger.error("Could not recalculate card", "base card could not be found");
		return card;
	}

	// Reset it's stats back to its original base stats
	card.stats.ability = card_base.stats.ability;
	card.stats.reputation = card_base.stats.reputation;

	// Iterate through each level and increase the stats
	for (let i = 0; i < card.stats.level - 1; i++) {
		card.stats.ability += config_player.xp.card.rewards.level_up.ABILITY;
		card.stats.reputation += config_player.xp.card.rewards.level_up.REPUTATION;
	}

	// Reset how much XP the card needs to level up
	card.stats.xp_for_next_level = card.stats.level * config_player.xp.card.LEVEL_XP_MULTIPLIER;

	return card;
}

function levelUp(card) {
	// Used to keep track of what happened
	let session = {
		leveled: false,
		levels_gained: 0,

		/** @type {number} */
		level_current: card.stats.level
	};

	const levelUp = () => {
		if (card.stats.level >= config_player.xp.card.LEVEL_MAX) return;

		if (card.stats.xp >= card.stats.xp_for_next_level) {
			// Subtract the required XP to level up from the card
			card.stats.xp = card.stats.xp - card.stats.xp_for_next_level || 0;

			// Increase the card's level
			card.stats.level++;

			// Calculate the XP required for the next level
			card.stats.xp_for_next_level = Math.floor(card.stats.level * config_player.xp.card.LEVEL_XP_MULTIPLIER);

			// Update session data
			session.levels_gained++;
			session.leveled = true;
		}
	};

	while (card.stats.xp >= card.stats.xp_for_next_level) levelUp();

	return { card: recalculateStats(card), ...session };

	/* session = { leveled: false, levelsGained: 0, ...session };

	// Don't level the card past the max card level
	if (card.stats.level === config_player.xp.card.LEVEL_MAX) return session;

	// Increase the card's level by 1 if they meet or surpass the required XP
	if (card.stats.xp >= card.stats.xp_for_next_level) {
		card.stats.level++;
		session.leveled = true;
		session.levelsGained++;

		// If the card's at its max level set its XP to its required xp_for_next_level
		if (card.stats.level === config_player.xp.card.LEVEL_MAX) card.stats.xp = card.stats.xp_for_next_level;
		else {
			// Reset XP, keeping any overshoot
			// defaults to 0 if there wasn't a positive overshoot value
			card.stats.xp = card.stats.xp - card.stats.xp_for_next_level || 0;

			// Multiply the card's xp_for_next_level by its multipler
			card.stats.xp_for_next_level = Math.round(card.stats.level * config_player.xp.card.LEVEL_XP_MULTIPLIER);

			card = recalculateStats(card);

			// Recursively level up the card if there's still enough XP
			if (card.stats.xp >= card.stats.xp_for_next_level) return tryLevelUp(card, session);
		}
	}

	// Return whether the card was leveled up or not
	session.card = card;
	return session; */
}

//! General
function resetUID(card) {
	card.uid = _jsT.alphaNumericString(6).toUpperCase();
	return card;
}

//! Drop
/** @param {"general" | "weekly" | "season" | "event_1" | "event_2"} dropType */
function drop(dropType, count = 1) {
	let cards_dropped = [];

	switch (dropType) {
		case "general":
			for (let i = 0; i < count; i++) {
				let pickedCategory = _jsT.choiceWeighted(categories_general);
				let pickedCategory_cards = cards_general.filter(card => card.rarity === pickedCategory.cardRarityFilter);

				cards_dropped.push(structuredClone(_jsT.choice(pickedCategory_cards)));
			}
			break;

		case "weekly":
			let _cards_weekly = cards.shop.filter(card => shopSetsInStock.filter(id => id !== "100").includes(card.setID));

			for (let i = 0; i < count; i++) cards_dropped.push(structuredClone(_jsT.choice(_cards_weekly)));

			break;

		case "season":
			let _cards_season = cards.seas.filter(card => eventSettings.season.cardRarityFilter.includes(card.rarity));

			for (let i = 0; i < count; i++) cards_dropped.push(structuredClone(_jsT.choice(_cards_season)));

			break;

		case "event_1":
			let _cards_event1 = [...cards.evnt, ...cards.bday, ...cards.holi].filter(card =>
				eventSettings.event1.cardRarityFilter.includes(card.rarity)
			);

			for (let i = 0; i < count; i++) cards_dropped.push(structuredClone(_jsT.choice(_cards_event1)));

			break;

		case "event_2":
			let _cards_event2 = [...cards.evnt, ...cards.bday, ...cards.holi].filter(card =>
				eventSettings.event2.cardRarityFilter.includes(card.rarity)
			);

			for (let i = 0; i < count; i++) cards_dropped.push(structuredClone(_jsT.choice(_cards_event2)));

			break;
	}

	// Reset each card's UID
	cards_dropped.forEach(card => resetUID(card));

	// Return the chosen cards
	return cards_dropped;
}

//! Get
function get_globalID(globalID) {
	return structuredClone(cards_all.find(card => card.globalID === globalID)) || null;
}

function get_fromShop(globalID, special = false) {
	let _card_shop_set_ids = special ? config_shop.stock.card_set_ids.SPECIAL : config_shop.stock.card_set_ids.GENERAL;

	let _cards = cards_all.filter(card => _card_shop_set_ids.includes(card.setID));
	return structuredClone(_cards.find(card => card.globalID === globalID)) || null;
}

function get_setID(setID) {
	return structuredClone(cards_all.filter(card => card.setID === setID)) || [];
}

/** @param {options_get_random} options */
function get_random(options = {}) {
	options = { type: "all", level: { min: 1, max: 100 }, count: 1, ...options };

	options.level.min = _jsT.clamp(options.level.min, { min: 1, max: 100 });
	options.level.max = _jsT.clamp(options.level.max, { min: 1, max: 100 });

	let cards = [];

	switch (options.type) {
		case "all":
			cards.push(...[...Array(options.length)].map(() => _jsT.choice(cards_all, true)));
			break;

		case "general":
			cards.push(...[...Array(options.length)].map(() => _jsT.choice(cards_general, true)));
			break;
	}

	// prettier-ignore
	cards = cards.filter(c => c).map(c => {
		if (options.level.min && options.level.max) {
			c.level = _jsT.randomNumber(options.level.min, options.level.max);
			return resetUID(recalculateStats(c));
		}

		return resetUID(c);
	});

	return cards.length > 1 ? cards : cards[0];
}

/** @param {"general" | "weekly" | "season" | "event_1" | "event_2"} dropCategory */
function get_randomDrop(dropCategory) {
	let card_choices = [];

	switch (dropCategory) {
		case "general":
			let categories = Object.values(config_drop.chance).map(c => ({ ...c, rarity: c.CHANCE }));
			let category_picked = _jsT.choiceWeighted(categories);

			card_choices = cards_general.filter(card => card.rarity === category_picked.CARD_RARITY_FILTER);

			// Return 5 random cards from the list
			return [...new Array(5)].map(() => _jsT.choice(card_choices, true)) || null;

		case "weekly":
			card_choices = cards.shop.filter(card =>
				config_shop.stock.card_set_ids.GENERAL.filter(id => id !== "100").includes(card.setID)
			);
			// Return a random card from the list
			return [_jsT.choice(card_choices, true)] || null;

		case "season":
			card_choices = cards.seas.filter(card => config_event.season.CARD_RARITY_FILTER.includes(card.rarity));
			// Return a random card from the list
			return [_jsT.choice(card_choices, true)] || null;

		case "event_1":
			card_choices = cards.evnt.filter(card => config_event.event_1.CARD_RARITY_FILTER.includes(card.rarity));
			// Return a random card from the list
			return [_jsT.choice(card_choices, true)] || null;

		case "event_2":
			card_choices = cards.evnt.filter(card => config_event.event_2.CARD_RARITY_FILTER.includes(card.rarity));
			// Return a random card from the list
			return [_jsT.choice(card_choices, true)] || null;
	}
}

//! Parse
function parse_toCardLike(card) {
	if (!card) return null;

	// Ignores custom cards
	return ["100"].includes(card.rarity)
		? card
		: {
				uid: card.uid,
				globalID: card.globalID,
				locked: card?.locked || false,
				stats: card.stats
		  };
}

function parse_fromCardLike(cardLike) {
	if (!cardLike) return null;
	return { ...get_globalID(cardLike.globalID), ...cardLike };
}

//! To String
function toString_basic(card) {
	return "%UID %EMOJI %GROUP :: %SINGLE - %NAME %SELL_PRICE"
		.replace("%UID", `\`${card.uid}\``)
		.replace("%EMOJI", `\`${card.emoji}\``)
		.replace("%GROUP", `**${card.group}**`)
		.replace("%SINGLE", card.single)
		.replace("%NAME", markdown.link(card.name, card.imageURL))
		.replace("%SELL_PRICE", `\`💰 ${card.sellPrice}\``);
}

/* function toString_inventory(card, options = {}) {
	if (!card) return "n/a";

	options = { favorited: false, selected: false, onTeam: false, simplify: false, duplicate: false, ...options };

	// prettier-ignore
	let f = "$UID $EMOJI $GROUP : $SINGLE - $NAME $DUPE\n> $SET_ID $GLOBAL_ID $RARITY $CATEGORY $SELL_PRICE $LOCKED\n> $LEVEL $STATS $FAVORITE $SELECTED $TEAM"
		.replace("$UID ", card?.uid ? `\`${card?.uid}\` ` : "")
		.replace("$EMOJI", `\`${card.emoji}\``)
		.replace("$GROUP", `**${card.group}**`)
		.replace("$SINGLE", card.single)
		.replace("$NAME", markdown.link(card.name, card.imageURL))

		.replace("$SET_ID", `\`🗣️ ${card.setID}\``)
		.replace("$GLOBAL_ID", `\`${card.globalID}\``)
		.replace("$RARITY", `\`R${card.rarity}\``)
		.replace("$CATEGORY", `\`${card.category}\``)
		.replace("$SELL_PRICE", `\`💰 ${card.sellPrice}\``)
		
		.replace(
			" $LOCKED\n> $LEVEL $STATS $FAVORITE $SELECTED $TEAM",
			options.simplify ? "" : " $LOCKED\n> $LEVEL $STATS $FAVORITE $SELECTED $TEAM"
		)
		
		.replace(" $LOCKED", card.locked ? " \`🔒\`" : "")
		
		.replace("$LEVEL", `\`LV.${card.stats.level}\``)
		.replace("$STATS", `\`🎤 ${card.stats.ability} : 💖 ${card.stats.reputation}\``)
		.replace(" $FAVORITE", options.favorite ? " \`⭐\`" : "")
		.replace(" $SELECTED", options.selected ? " \`🏃\`" : "")
		.replace(" $TEAM", options.onTeam ? "  \`👯\`" : "");

	// prettier-ignore
	// Format duplicate option
	if (options.duplicate === true)
		f = f.replace(" $DUPE", ` *${superscript.dupe}*`);
	else if (!isNaN(options.duplicate) && options.duplicate > 0)
		f = f.replace(" $DUPE", ` **-- ${String(options.duplicate).split("").map(n => superscript.numbers[+n]).join("")}**`);
	else
		f = f.replace(" $DUPE", "");

	return f;
} */

/** @param {options_toStr_inventory} options  */
function toString_inventory(card, options = {}) {
	if (!card) return "n/a";

	options = { favorited: false, selected: false, onTeam: false, simplify: false, duplicate: false, ...options };

	// prettier-ignore
	// let f = "$UID $EMOJI $GROUP : $SINGLE - $NAME $DUPE\n> $SET_ID $GLOBAL_ID $RARITY $CATEGORY $SELL_PRICE $LOCKED\n> $LEVEL $STATS $FAVORITE $SELECTED $TEAM"
	let f = "**`$UID`** `$GID` `🗣️ $SET`\n`$EMOJI` **$SINGLE** `$GROUP` $NAME $DUPE\n`LV. $LVL` `$CATEGORY` `💰 $SELL` `🎤 $ABI` : `💖 $REP`\n`🔒 ⭐ 🏃 👯`"
		.replace("$UID", card?.uid || "")
		.replace("$GID", card.globalID)
		.replace("$SET", card.setID)

		.replace("$EMOJI", card.emoji)
		.replace("$SINGLE", card.single)
		.replace("$GROUP", card.group)
		// .replace("$NAME", card.name)
		.replace("$NAME", markdown.link(card.name, card.imageURL))

		.replace("$LVL", card.stats.level)
		.replace("$CATEGORY", card.category)
		.replace("$SELL", card.sellPrice)


		.replace("$ABI", card.stats.ability)
		.replace("$REP", card.stats.reputation);

	// .replace("$RARITY", `\`R${card.rarity}\``)
	// .replace("$CATEGORY", `\`${card.category}\``)
	// .replace("$SELL_PRICE", `\`💰 ${card.sellPrice}\``)

	/* .replace(
			" $LOCKED\n> $LEVEL $STATS $FAVORITE $SELECTED $TEAM",
			options.simplify ? "" : " $LOCKED\n> $LEVEL $STATS $FAVORITE $SELECTED $TEAM"
		) */

	// .replace(" $LOCKED", card.locked ? " \`🔒\`" : "")

	// .replace("$LEVEL", `\`LV.${card.stats.level}\``)
	// .replace("$STATS", `\`🎤 ${card.stats.ability} : 💖 ${card.stats.reputation}\``)
	// .replace(" $FAVORITE", options.favorite ? " \`⭐\`" : "")
	// .replace(" $SELECTED", options.selected ? " \`🏃\`" : "")
	// .replace(" $TEAM", options.onTeam ? "  \`👯\`" : "");

	// prettier-ignore
	// Format duplicate option
	if (options.duplicate === true)
		f = f.replace(" $DUPE", ` *${superscript.dupe}*`);
	else if (!isNaN(options.duplicate) && options.duplicate > 0)
		f = f.replace(" $DUPE", ` **-- ${String(options.duplicate).split("").map(n => superscript.numbers[+n]).join("")}**`);
	else
		f = f.replace(" $DUPE", "");

	return f;
}

function toString_missingEntry(card, has = false) {
	return "%GLOBAL_ID %EMOJI %GROUP :: %SINGLE - %NAME\n> %SET_ID %RARITY %CATEGORY %MISSING"
		.replace("%GLOBAL_ID", `\`${card.globalID}\``)
		.replace("%EMOJI", `\`${card.emoji}\``)
		.replace("%GROUP", `**${card.group}**`)
		.replace("%SINGLE", card.single)
		.replace("%NAME", markdown.link(card.name, card.imageURL))

		.replace("%SET_ID", `\`🗣️${card.setID}\``)
		.replace("%RARITY", `\`R${card.rarity}\``)
		.replace("%CATEGORY", `\`${card.category}\``)

		.replace("%MISSING", has ? "`✔️ owned`" : "`🚫 missing`");
}

function toString_itemPackSetEntry(setID, chance) {
	let _card = get_setID(setID)[0];
	if (!_card) return "n/a";

	// return "%SET_ID %EMOJI %GROUP :: %SINGLE %CHANCE"
	return "%SET_ID %EMOJI %DESCRIPTION %CHANCE"
		.replace("%SET_ID", `\`${_card.setID}\``)
		.replace("%EMOJI", `\`${_card.emoji}\``)
		.replace("%GROUP", `**${_card.group}**`)
		.replace("%SINGLE", _card.single)
		.replace("%DESCRIPTION", _card.description)
		.replace("%CHANCE", `\`%${chance}\``);
}

/** @param {"carrot"|"ribbon"} currencyType  */
function toString_shopEntry(card, currencyType = "carrot") {
	let _currencyIcon = "";

	switch (currencyType) {
		case "carrot":
			_currencyIcon = config_bot.emojis.currency_1.EMOJI;
			break;
		case "ribbon":
			_currencyIcon = config_bot.emojis.currency_2.EMOJI;
			break;
	}

	return "%GLOBAL_ID %EMOJI %GROUP :: %SINGLE : %NAME %SET_ID %PRICE"
		.replace("%GLOBAL_ID", inline(card.globalID))
		.replace("%EMOJI", inline(card.emoji))
		.replace("%GROUP", bold(card.group))
		.replace("%SINGLE", card.single)
		.replace("%NAME", link(card.name, card.imageURL))
		.replace("%SET_ID", inline("🗣️", card.setID))
		.replace("%PRICE", inline(_currencyIcon, card.price));
}

function toString_setEntry(card) {
	let count = get_setID(card.setID).length || 1;
	if (count < 10) count = `0${count}`;

	// return "%SET_ID %CARD_COUNT %CATEGORY %EMOJI %DESCRIPTION%SINGLE"
	return "%SET_ID %CARD_COUNT %CATEGORY %EMOJI %DESCRIPTION"
		.replace("%SET_ID", `\`🗣️${card.setID}\``)

		.replace("%CARD_COUNT", `\`📁 ${count || 1}\``)

		.replace("%CATEGORY", `\`${card.category}\``)
		.replace("%EMOJI", `\`${card.emoji}\``)
		.replace("%GROUP", `**${card.group}**`)
		.replace("%DESCRIPTION", card.description);
}

// prettier-ignore
module.exports = {
	cards, cards_all, cards_general,
	cardCount: cards_all.length,

	category: {
		colors: category_colors,
		emojis: category_emojis,

		names: {
			base: category_names_base,
			all: category_names_all
		},

		globalIDs: {
			base: category_globalIDs_base,
			all: category_globalIDs_all
		}
	},

	cards_shop: {
		general: cards_all.filter(card => config_shop.stock.card_set_ids.GENERAL.includes(card.setID)),
		special: cards_all.filter(card => config_shop.stock.card_set_ids.SPECIAL.includes(card.setID)),
		setIDs_general: config_shop.stock.card_set_ids.GENERAL,
		setIDs_special: config_shop.stock.card_set_ids.SPECIAL
	},

	resetUID,
	recalculateStats,
	levelUp,

	drop,

	get: {
		globalID: get_globalID,
		setID: get_setID,
		fromShop: get_fromShop,
		random: get_random,
		drop: get_randomDrop
	},

	parse: {
		toCardLike: parse_toCardLike,
		fromCardLike: parse_fromCardLike
	},

	toString: {
		basic: toString_basic,
		inventory: toString_inventory,
		missingEntry: toString_missingEntry,
		itemPackSetEntry: toString_itemPackSetEntry,
		shopEntry: toString_shopEntry,
		setEntry: toString_setEntry
	}
};
