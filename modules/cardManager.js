/** @typedef options_toStr_inventory
 * @property {boolean} locked
 * @property {boolean} favorite
 * @property {boolean} selected
 * @property {boolean} onTeam
 * @property {boolean|number} duplicate
 * @property {boolean} showXP
 * @property {boolean} simplify */

/** @typedef options_get_random
 * @property {"all"|"general"} type
 * @property {{min:number, max:number}} level
 * @property {number} count */

const { markdown } = require("./discordTools");
const jt = require("./jsTools");
const logger = require("./logger");

const config = {
	player: require("../configs/config_player.json"),
	event: require("../configs/config_event.json"),
	shop: require("../configs/config_shop.json"),
	drop: require("../configs/config_drop.json"),
	bot: require("../configs/config_bot.json")
};

const cards_base = {
	comn: require("../cards/common.json"),
	uncn: require("../cards/uncommon.json"),
	rare: require("../cards/rare.json"),
	epic: require("../cards/epic.json"),
	mint: require("../cards/mint.json"),

	bday: require("../cards/bday.json"),
	holi: require("../cards/holiday.json"),
	evnt: [...require("../cards/event1.json"), ...require("../cards/event2.json"), ...require("../cards/event3.json")],

	seas: require("../cards/season.json"),
	shop: require("../cards/shop.json"),
	cust: require("../cards/custom.json")
};

/// Card arrays
const cards_all = [].concat(...Object.values(cards_base));
const cards_general = [...cards_base.comn, ...cards_base.uncn, ...cards_base.rare, ...cards_base.epic, ...cards_base.mint];
const cards_event = [...cards_base.bday, ...cards_base.holi, ...cards_base.evnt];

// prettier-ignore
const cards_shop_all = cards_all.filter(card =>
	[...config.shop.stock.card_set_ids.GENERAL, ...config.shop.stock.card_set_ids.SPECIAL].includes(card.setID)
).filter(c => c.price !== null);
const cards_shop_general = cards_shop_all.filter(card => config.shop.stock.card_set_ids.GENERAL.includes(card.setID));
const cards_shop_special = cards_shop_all.filter(card => config.shop.stock.card_set_ids.SPECIAL.includes(card.setID));

// Card category meta
const cards_category_names = {
	base: Object.keys(cards_base),
	all: jt.unique(cards_all.map(c => c.category)),
	general: jt.unique(cards_general.map(c => c.category))
};

const cards_globalIDs = {
	base: jt.toMap(Object.entries(cards_base), ([cat, c]) => ({ key: cat, value: c.map(c => c.globalID) })),

	// prettier-ignore
	all: jt.toMap(cards_category_names.all, cat =>
		({ key: cat, value: cards_all.filter(c => c.category === cat).map(c => c.globalID) })
	),

	// prettier-ignore
	general: jt.toMap(cards_category_names.general, cat =>
		({ key: cat, value: cards_all.filter(c => c.category === cat).map(c => c.globalID) })
	)
};

const cards_category_meta = {
	base: {
		comn: { emoji: "🔴", name: "comn", color_ansi: "red" },
		uncn: { emoji: "🟡", name: "uncn", color_ansi: "yellow" },
		rare: { emoji: "🟢", name: "rare", color_ansi: "green" },
		epic: { emoji: "🔵", name: "epic", color_ansi: "blue" },
		mint: { emoji: "🟣", name: "mint", color_ansi: "pink" },

		bday: { emoji: "🟥", name: "bday", color_ansi: "red" },
		holi: { emoji: "🟨", name: "holi", color_ansi: "yellow" },
		evnt: { emoji: "🟩", name: "evnt", color_ansi: "green" },
		seas: { emoji: "🟦", name: "seas", color_ansi: "blue" },
		shop: { emoji: "🟪", name: "shop", color_ansi: "pink" },
		cust: { emoji: "⬜", name: "cust", color_ansi: "white" }
	}
};

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
		card.stats.ability += config.player.xp.card.rewards.level_up.ABILITY;
		card.stats.reputation += config.player.xp.card.rewards.level_up.REPUTATION;
	}

	// Reset how much XP the card needs to level up
	card.stats.xp_for_next_level = card.stats.level * config.player.xp.card.LEVEL_XP_MULTIPLIER;

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
		if (card.stats.level >= config.player.xp.card.LEVEL_MAX) return;

		if (card.stats.xp >= card.stats.xp_for_next_level) {
			// Subtract the required XP to level up from the card
			card.stats.xp = card.stats.xp - card.stats.xp_for_next_level || 0;

			// Increase the card's level
			card.stats.level++;

			// Calculate the XP required for the next level
			card.stats.xp_for_next_level = Math.floor(card.stats.level * config.player.xp.card.LEVEL_XP_MULTIPLIER);

			// Update session data
			session.level_current++;
			session.levels_gained++;
			session.leveled = true;
		}
	};

	while (card.stats.xp >= card.stats.xp_for_next_level && card.stats.level < config.player.xp.card.LEVEL_MAX) levelUp();

	return { card: recalculateStats(card), ...session };
}

//! General
function resetUID(card) {
	card.uid = jt.alphaNumericString(6).toUpperCase();
	return card;
}

//! Get
function get_globalID(globalID) {
	return structuredClone(cards_all.find(card => card.globalID === globalID)) || null;
}

function get_setID(setID) {
	return structuredClone(cards_all.filter(card => card.setID === setID)) || [];
}

function get_fromShop(globalID) {
	return structuredClone(cards_shop_all.find(c => c.globalID === globalID)) || null;
}

function get_baseCategoryName(globalID) {
	for (let cat of cards_category_names.base) {
		if (cards_globalIDs.base.get(cat).includes(globalID)) return cat;
	}

	return null;
}

function get_imageURL(globalID) {
	let card = get_globalID(globalID);
	if (!card) return null;

	return card.imageURL || "";
}

/** @param {options_get_random} options */
function get_random(options = {}) {
	options = { type: "all", level: { min: 1, max: 100 }, count: 1, ...options };
	options.level.min = jt.clamp(options.level.min, { min: 1, max: 100 });
	options.level.max = jt.clamp(options.level.max, { min: 1, max: 100 });

	let cards = [];

	// prettier-ignore
	switch (options.type) {
		case "all": cards = [...Array(options.count)].map(() => jt.choice(cards_all, true)); break;
		
		case "general": cards = [...Array(options.count)].map(() => jt.choice(cards_general, true)); break;
	}

	// Parse cards
	for (let i = 0; i < cards.length; i++) {
		// Give it a random level
		cards[i].stats.level = jt.randomNumber(options.level.min, options.level.max);

		// Recalculate stats
		recalculateStats(cards[i]);
		// Give it a fake UID
		resetUID(cards[i]);
	}

	return cards.length > 1 ? cards : cards[0];
}

/** @param {"general" | "weekly" | "season" | "event_1" | "event_2"} dropCategory */
function get_randomDrop(dropCategory) {
	let card_choices = [];

	switch (dropCategory) {
		case "general":
			let categories = Object.values(config.drop.chance).map(c => ({ ...c, rarity: c.CHANCE }));
			let category_picked = jt.choiceWeighted(categories);

			card_choices = cards_general.filter(card => card.rarity === category_picked.CARD_RARITY_FILTER);

			// Return 5 random cards from the list
			return [...new Array(5)].map(() => jt.choice(card_choices, true)) || null;

		case "weekly":
			card_choices = cards_base.shop.filter(card =>
				config.shop.stock.card_set_ids.GENERAL.filter(id => id !== "100").includes(card.setID)
			);
			// Return a random card from the list
			return [jt.choice(card_choices, true)] || null;

		case "season":
			card_choices = cards_base.seas.filter(card => config.event.season.CARD_RARITY_FILTER.includes(card.rarity));
			// Return a random card from the list
			return [jt.choice(card_choices, true)] || null;

		case "event_1":
			card_choices = cards_base.evnt.filter(card => config.event.event_1.CARD_RARITY_FILTER.includes(card.rarity));
			// Return a random card from the list
			return [jt.choice(card_choices, true)] || null;

		case "event_2":
			card_choices = cards_base.evnt.filter(card => config.event.event_2.CARD_RARITY_FILTER.includes(card.rarity));
			// Return a random card from the list
			return [jt.choice(card_choices, true)] || null;
	}
}

//! Parse
function parse_toCardLike(card) {
	if (!card) return null;

	// Don't alter custom cards
	if (card.setID === "100") return card;

	return {
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
function toString_gidPeak(globalID) {
	let card = get_globalID(globalID);
	if (!card) return "n/a";

	return markdown.link(
		card.globalID,
		card.imageURL,
		"$SET_ID $SINGLE [$GROUP] $NAME"
			.replace("$SET_ID", card.setID)
			.replace("$SINGLE", card.single)
			.replace("$GROUP", card.group)
			.replace("$NAME", card.name)
	);
}

function toString_basic(card) {
	// return "**`$UID`** `$EMOJI` **$GROUP** *`$SINGLE`* $NAME `💰 $SELL_PRICE`"
	return "**`$UID`** `$EMOJI` **$SINGLE** `[$GROUP]` $NAME"
		.replace("$UID", card.uid)
		.replace("$EMOJI", card.emoji)
		.replace("$GROUP", card.group)
		.replace("$SINGLE", card.single)
		.replace("$NAME", markdown.link(card.name, card.imageURL))
		.replace("$SELL_PRICE", card.sellPrice);
}

function toString_stage(card) {
	return "> **`$UID`** `$GID` `🗣️ $SET`\n> `$EMOJI` **$SINGLE** `[$GROUP]` $NAME\n> `📈 $LVL` `🎤 $ABI` `💖 $REP`"
		.replace("$UID", card.uid)
		.replace("$GID", card.globalID)
		.replace("$SET", card.setID)

		.replace("$EMOJI", card.emoji)
		.replace("$SINGLE", card.single)
		.replace("$GROUP", card.group)
		.replace("$NAME", markdown.link(card.name, card.imageURL))

		.replace("$LVL", card.stats.level)
		.replace("$ABI", card.stats.ability)
		.replace("$REP", card.stats.reputation);
}

function toString_selectionEntry(card, duplicate = false) {
	let label = "$EMOJI $SINGLE [$GROUP] $NAME $DUPE"
		.replace("$EMOJI", card.emoji)
		.replace("$SINGLE", card.single)
		.replace("$GROUP", card.group)
		.replace("$NAME", card.name)
		.replace(" $DUPE", duplicate ? ` ${superscript.dupe}` : "");

	let description = "$UID :: GID: $GID :: 🗣️ $SET"
		.replace("$UID", card.uid ? `UID: ${card.uid}` : "")
		.replace("$GID", card.globalID)
		.replace("$SET", card.setID);

	return { label, description };
}

/** @param {options_toStr_inventory} options  */
function toString_inventoryEntry(card, options) {
	if (!card) return "n/a";

	// prettier-ignore
	options = {
		locked: false, favorite: false, selected: false, onTeam: false,
		duplicate: false, showXP: false, simplify: false,
		...options
	};

	let extra = [];
	if (options.locked) extra.push("`🔒`");
	if (options.favorite) extra.push("`⭐`");
	if (options.selected) extra.push("`🏃`");
	if (options.onTeam) extra.push("`👯`");

	// prettier-ignore
	let f = "> $UID `$GID` `🗣️ $SET`\n> `$EMOJI` **$SINGLE** `[$GROUP]` $NAME $DUPE\n> `$CATEGORY` `🎤 $ABI` `💖 $REP`\n> `📈 $LVL` `💰 $SELL` $EXTRA"
		.replace(" $UID", card?.uid ? ` **\`${card.uid}\`**` : "")
		.replace("$GID", card.globalID)
		.replace("$SET", card.setID)

		.replace("$EMOJI", card.emoji)
		.replace("$SINGLE", card.single)
		.replace("$GROUP", card.group)
		.replace("$NAME", markdown.link(card.name, card.imageURL));

	// prettier-ignore
	if (options.simplify) f = f
		.replace(" $DUPE", !options.duplicate ? "" : " $DUPE")
		.replace("> `📈 $LVL`", "")
		.replace(" `💰 $SELL`", "")
		.replace(" $EXTRA", "");

	// prettier-ignore
	f = f
		.replace("$LVL", `${card.stats.level}${options.showXP ? ` : ${card.stats.xp}/${card.stats.xp_for_next_level}XP` : ""}`)

		.replace("$CATEGORY", card.category)
		.replace("$SELL", card.sellPrice)

		.replace("$ABI", card.stats.ability)
		.replace("$REP", card.stats.reputation)
		.replace(" $EXTRA", extra.length ? ` ${extra.join(" ")}` : "");

	// prettier-ignore
	// Format duplicate option
	if (options.duplicate === true)
		f = f.replace(" $DUPE", ` ***${superscript.dupe}***`);
	else if (!isNaN(options.duplicate) && options.duplicate > 0)
		f = f.replace(" $DUPE", ` **-- ${String(options.duplicate).split("").map(n => superscript.numbers[+n]).join("")}**`);
	else
		f = f.replace(" $DUPE", "");

	return f;
}

function toString_missingEntry(card, userOwnsCard = false) {
	return "> **`$MISSING`** **`$GLOBAL_ID`**\n> `$EMOJI` **$GROUP** `[$SINGLE]` $NAME"
		.replace("$MISSING", userOwnsCard ? "✔️ owned" : "❌ missing")
		.replace("$GLOBAL_ID", card.globalID)
		.replace("$EMOJI", card.emoji)
		.replace("$SINGLE", card.single)
		.replace("$GROUP", card.group)
		.replace("$NAME", markdown.link(card.name, card.imageURL));
}

function toString_shopEntry(globalID) {
	let card = get_globalID(globalID);
	let isSpecial = config.shop.stock.card_set_ids.SPECIAL.includes(card.setID);

	// prettier-ignore
	let { currency_1: { EMOJI: carrot }, currency_2: { EMOJI: ribbon } } = config.bot.emojis;

	return "`$GID` `🗣️ $SET_ID` `$EMOJI` **$GROUP** `[$SINGLE]` $NAME `$PRICE`"
		.replace("$GID", card.globalID)
		.replace("$SET_ID", card.setID)
		.replace("$EMOJI", card.emoji)
		.replace("$SINGLE", card.single)
		.replace("$GROUP", card.group)
		.replace("$NAME", markdown.link(card.name, card.imageURL))
		.replace("$PRICE", `${isSpecial ? ribbon : carrot} ${card.price}`);
}

/** @param {{globalID:number, setID:number}} options  */
function toString_setEntry(options) {
	options = { globalID: null, setID: null, ...options };

	let card = get_globalID(options.globalID);
	let set = get_setID(card ? card.setID : options.setID);
	card ||= set[0];

	return "> **`$CATEGORY`** `$SET_ID` `$COUNT` `$EMOJI` $DESCRIPTION"
		.replace("$SET_ID", `🗣️ ${card.setID}`)
		.replace("$COUNT", `📁 ${set.length < 10 ? `0${set.length}` : set.length}`)
		.replace("$CATEGORY", card.category)
		.replace("$EMOJI", card.emoji)
		.replace("$DESCRIPTION", card.description);
}

function toString_cardPackEntry(setID, rarity) {
	let card = get_setID(setID)[0];
	if (!card) return "n/a";

	return "> `$SET_ID` `$EMOJI` $DESCRIPTION `$RARITY%`"
		.replace("$SET_ID", card.setID)
		.replace("$EMOJI", card.emoji)
		.replace("$GROUP", card.group)
		.replace("$SINGLE", card.single)
		.replace("$DESCRIPTION", card.description)
		.replace("$RARITY", rarity);
}

// prettier-ignore
module.exports = {
	cards: {
		base: cards_base,
		all: cards_all,
		general: cards_general,
		event: cards_event,
		count: cards_all.length,

		globalIDs: cards_globalIDs,

		shop: {
			all: cards_shop_all,
			general: cards_shop_general,
			special: cards_shop_special,
			count: cards_shop_all.length,

			setIDs: {
				all: [].concat(...Object.values(config.shop.stock.card_set_ids)),
				general: config.shop.stock.card_set_ids.GENERAL,
				special: config.shop.stock.card_set_ids.SPECIAL
			}
		},

		category: {
			names: cards_category_names,
			meta: cards_category_meta
		},
	},

	resetUID,
	recalculateStats,
	levelUp,

	get: {
		globalID: get_globalID,
		setID: get_setID,
		fromShop: get_fromShop,
		baseCategoryName: get_baseCategoryName,
		imageURL: get_imageURL,
		random: get_random,
		drop: get_randomDrop
	},

	parse: {
		toCardLike: parse_toCardLike,
		fromCardLike: parse_fromCardLike
	},

	toString: {
		gidPeak: toString_gidPeak,
		basic: toString_basic,
		stage: toString_stage,
		selectionEntry: toString_selectionEntry,
		inventoryEntry: toString_inventoryEntry,
		missingEntry: toString_missingEntry,
		cardPackEntry: toString_cardPackEntry,
		shopEntry: toString_shopEntry,
		setEntry: toString_setEntry
	}
};
