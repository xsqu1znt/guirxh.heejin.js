/** @typedef options_inventory
 * @property {GuildMember|User} target
 * @property {string} rarity
 * @property {string} setID
 * @property {string} globalID
 * @property {string} category
 * @property {string} group
 * @property {string} single
 * @property {string} name
 * @property {"setID"|"gid"} sorting
 * @property {"ascending"|"descending"} order */

const { GuildMember, User, time, TimestampStyles } = require("discord.js");

const BetterEmbed = require("../discordTools/dsT_betterEmbed");
const cardManager = require("../cardManager");
const userParser = require("../userParser");
const _jsT = require("../jsTools/_jsT");

const config_player = require("../../configs/config_player.json");

function profile(user, userData) {
	let 
}

function missing(user, cards, cards_have) {
	// Sort the cards by set ID then global ID :: { DESCENDING }
	cards.sort((a, b) => a.setID - b.setID || a.globalID - b.globalID);

	// prettier-ignore
	// Format the user's cards into list entries, with a max of 10 per page
	let cards_f = _jsT.chunk(cards.map((c, idx) => cardManager.toString.missingEntry(c, cards_have[idx])), 10);

	// Create the embeds :: { MISSING }
	let embeds_missing = [];

	// prettier-ignore
	for (let i = 0; i < cards_f.length; i++) embeds_missing.push(
		new BetterEmbed({
            author: { text: "$USERNAME | missing", user }, description: cards_f[i].join("\n"),
			footer: { text: `Page ${i + 1}/${cards_f.length || 1} | Owned: ${cards_have.filter(b => b).length}/${cards.length}` }
		})
	);

	return embeds_missing;
}

/** @param {options_inventory} options  */
function inventory(userData, options) {
	// prettier-ignore
	options = {
        target: null,
        rarity: "", setID: "", globalID: "",
        category: "", group: "", single: "", name: "",
        sorting: "setID", order: "ascending", ...options
    };

	/// Parse options
	// prettier-ignore
	options.rarity = options.rarity.split(",").map(str => str.trim().toLowerCase()).filter(str => str);
	// prettier-ignore
	options.setID = options.setID.split(",").map(str => str.trim().toLowerCase()).filter(str => str);
	// prettier-ignore
	options.globalID = options.globalID.split(",").map(str => str.trim().toLowerCase()).filter(str => str);
	// prettier-ignore
	options.category = options.category.split(",").map(str => str.trim().toLowerCase()).filter(str => str);
	// prettier-ignore
	options.group = options.group.split(",").map(str => str.trim().toLowerCase()).filter(str => str);
	// prettier-ignore
	options.single = options.single.split(",").map(str => str.trim().toLowerCase()).filter(str => str);
	// prettier-ignore
	options.name = options.name.split(",").map(str => str.trim().toLowerCase()).filter(str => str);

	/// Parse user's card_inventory
	let cards = userParser.cards.getInventory(userData, {
		dupeTag: options.globalID.length && options.globalID[0] !== "all" ? false : true,
		unique: options.globalID.length && options.globalID[0] !== "all" ? false : true
	});

	// prettier-ignore
	let filtered = false, dupeCheck = false;

	/// Apply inventory filters
	// prettier-ignore
	if (options.rarity.length) {
		let _cards = [];
		for (let _rarity of options.rarity)_cards.push(...cards.filter(c => String(c.card.rarity).toLowerCase().includes(_rarity)));
		cards = _cards; filtered = true;
	}
	// prettier-ignore
	if (options.setID.length) {
		let _cards = [];
		for (let _setID of options.setID)_cards.push(...cards.filter(c => c.card.setID.toLowerCase().includes(_setID)));
		cards = _cards; filtered = true;
	}
	// prettier-ignore
	if (options.category.length) {
		let _cards = [];
		for (let _category of options.category)_cards.push(...cards.filter(c => c.card.category.toLowerCase().includes(_category)));
		cards = _cards; filtered = true;
	}
	// prettier-ignore
	if (options.group.length) {
		let _cards = [];
		for (let _group of options.group)_cards.push(...cards.filter(c => c.card.group.toLowerCase().includes(_group)));
		cards = _cards; filtered = true;
	}
	// prettier-ignore
	if (options.single.length) {
		let _cards = [];
		for (let _single of options.single)_cards.push(...cards.filter(c => c.card.single.toLowerCase().includes(_single)));
		cards = _cards; filtered = true;
	}
	// prettier-ignore
	if (options.name.length) {
		let _cards = [];
		for (let name of options.name) _cards.push(...cards.filter(c => c.card.name.toLowerCase().includes(name)));
		cards = _cards; filtered = true;
	}

	// prettier-ignore
	// Apply duplicate filter
	if (options.globalID.length) if (options.globalID[0] === "all") {
        cards = cards.filter(c => c.duplicate_count);
        filtered = true;
    } else {
        cards = cards.filter(c => options.globalID.includes(c.card.globalID) && c.duplicate_count);
        filtered = true; dupeCheck = true;
    }

	// prettier-ignore
	// Sort the user's cards
	switch (options.sorting) {
        case "setID": cards.sort((a, b) => a.card.setID - b.card.setID || a.card.globalID - b.card.globalID); break;
        case "gid": cards.sort((a, b) => a.card.globalID - b.card.globalID); break;
    }

	// Reverse the order of the user's cards, if needed
	if (options.order === "descending") cards.reverse();

	// prettier-ignore
	// Return an embed :: { ERROR }
	if (!cards.length) return new BetterEmbed({
		author: { text: "$USERNAME | inventory", user: options.target },
		description: filtered ? dupeCheck
				? `You do not have any dupes of ${options.globalID.length === 1 ? "that card" : "those cards"}`
				: "No cards were found with that search filter"
			: "There are no cards in your inventory"
	});

	// prettier-ignore
	// Format the user's cards into list entries, with a max of 10 per page
	let cards_f = _jsT.chunk(cards.map(c => c.card_f), 10);

	/// Create the embeds :: { INVENTORY }
	let embeds_inventory = [];

	// prettier-ignore
	for (let i = 0; i < cards_f.length; i++) embeds_inventory.push(
		new BetterEmbed({
            author: { text: dupeCheck ? "$USERNAME | dupes" : "$USERNAME | inventory", user: options.target },
            thumbnailURL: dupeCheck ? cards.slice(-1)[0].card.imageURL : null,
			description: cards_f[i].join("\n"),
			footer: { text: `Page ${i + 1}/${cards_f.length || 1} | Total: ${cards.length}` }
		})
    );

	return embeds_inventory;
}

function cooldowns(user, userData) {
	// Get the active cooldowns from the config
	let cooldown_types = Object.entries(config_player.cooldowns)
		.filter(([type, time]) => time)
		.map(([type, time]) => type);

	// prettier-ignore
	// Get the user's cooldown timestamps from their UserData
	let cooldowns = cooldown_types.map(type => ({
		type, timestamp: userData.cooldowns.find(c => c.type === type)?.timestamp || 0
	}));

	// Format the user's cooldowns into list entries
	let cooldowns_f = cooldowns.map(cd => {
		let _eta = _jsT.eta({ then: cd.timestamp, ignorePast: true });

		return "`$AVAILABILITY $TYPE:` **$TIME**"
			.replace("$AVAILABILITY", _eta ? "❌" : "✔️")
			.replace("$TYPE", _jsT.toTitleCase(cd.type.replace(/_/g, " ")))
			.replace("$TIME", _eta ? time(_jsT.msToSec(cd.timestamp), TimestampStyles.RelativeTime) : "Available");
	});

	// Create the embed : { COOLDOWNS }
	let embed_cooldowns = new BetterEmbed({
		author: { text: "$USERNAME | cooldowns", user },
		description: cooldowns_f.join("\n")
	});

	return embed_cooldowns;
}

module.exports = { missing, inventory, cooldowns };
