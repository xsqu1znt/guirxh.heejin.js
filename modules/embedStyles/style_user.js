/** @typedef options_inventory
 * @property {GuildMember|User} target
 * @property {string} dupes
 * @property {string} setID
 * @property {string} group
 * @property {string} single
 * @property {string} name
 * @property {"setID"|"gid"} sorting
 * @property {"ascending"|"descending"} order */

const { GuildMember, User } = require("discord.js");

const BetterEmbed = require("../discordTools/dsT_betterEmbed");
const cardManager = require("../cardManager");
const userParser = require("../userParser");
const _jsT = require("../jsTools/_jsT");

function missing(user, userData, setID) {
	// Get the card set
	let cards = cardManager.get.setID(setID);
	// prettier-ignore
	// Return an embed :: { ERROR }
	if (!cards.length) return new BetterEmbed({
		author: { text: "$USERNAME | missing", user },
		description: "You must provide a valid set ID"
	});

	// Sort the cards by set ID then global ID :: { DESCENDING }
	cards.sort((a, b) => a.card.setID - b.card.setID || a.card.globalID - b.card.globalID);

	// Format the user's cards into list entries, with a max of 10 per page
	let cards_f = _jsT.chunk(
		cards.map(c => cardManager.toString.missingEntry(c, userParser.cards.has(userData, c.globalID))),
		10
	);

	// Create the embeds :: { MISSING }
	let embeds_missing = [];

	// prettier-ignore
	for (let i = 0; i < cards_f.length; i++) embeds_missing.push(
		new BetterEmbed({
            author: { text: "$USERNAME | missing", user }, description: cards_f[i].join("\n"),
			footer: { text: `Page ${i + 1}/${cards_f.length || 1} | Total: ${cards.length}` }
		})
    );
}

/* function userMissing_ES(guildMember, userData, setID) {
    // Create a base embed
    let embed_template = (description = "", footer_text = "") => new BetterEmbed({
        author: { text: "%AUTHOR_NAME | missing", user: guildMember },
        description: description || `\`${setID}\` is either empty or an invalid set.`,
        footer: { text: footer_text || null }
    });

    // Get every card in the set
    // let cards_set = cardManager.cards_all.filter(card => card.setID === setID);
    let cards_set = cardManager.get.setID(setID);
    if (cards_set.length === 0) return [embed_template()];

    // Sort by set ID (decending order)
    cards_set = cards_set.sort((a, b) => a.globalID - b.globalID);

    // Parse cards_set into an array of human readable strings
    let cards_set_f = cards_set.map(card => {
        let isMissing = userData.card_inventory.find(c => c.globalID === card.globalID) ? false : true;
        return cardManager.toString.missingEntry(card, isMissing);
    });

    // Break up cards into multiple pages to retain there being a max of 10 cards per page
    cards_set_f = arrayTools.chunk(cards_set_f, 10);

    // Create the embeds
    let embeds = [];
    for (let i = 0; i < cards_set_f.length; i++) {
        // Create the embed page
        embeds.push(embed_template(cards_set_f[i].join("\n"), `Page ${i + 1}/${cards_set_f.length || 1}`));
    }

    return embeds;
} */

/** @param {options_inventory} options  */
function inventory(userData, options) {
	// prettier-ignore
	options = {
        target: null,
        setID: "", dupes: "",
        group: "", single: "", name: "",
        sorting: "setID", order: "ascending", ...options
    };

	/// Parse options
	// prettier-ignore
	options.setID = options.setID.split(",").map(str => str.trim().toLowerCase()).filter(str => str);
	// prettier-ignore
	options.dupes = options.dupes.split(",").map(str => str.trim().toLowerCase()).filter(str => str);
	// prettier-ignore
	options.group = options.group.split(",").map(str => str.trim().toLowerCase()).filter(str => str);
	// prettier-ignore
	options.single = options.single.split(",").map(str => str.trim().toLowerCase()).filter(str => str);
	// prettier-ignore
	options.name = options.name.split(",").map(str => str.trim().toLowerCase()).filter(str => str);

	if (options.dupes[0] === "all") options.dupes = ["all"];

	/// Parse user's card_inventory
	let cards = userParser.cards.getInventory(userData, {
		dupeTag: options.dupes.length && options.dupes[0] !== "all" ? false : true,
		unique: options.dupes.length && options.dupes[0] !== "all" ? false : true
	});

	// prettier-ignore
	let filtered = false, dupeCheck = false;

	/// Apply inventory filters
	// prettier-ignore
	if (options.setID.length) {
		let _cards = [];
		for (let _setID of options.setID)_cards.push(...cards.filter(c => c.card.setID.toLowerCase().includes(_setID)));
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
	if (options.dupes.length) if (options.dupes[0] === "all") {
        cards = cards.filter(c => c.duplicate_count);
        filtered = true;
    } else {
        cards = cards.filter(c => options.dupes.includes(c.card.globalID) && c.duplicate_count);
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
				? `You do not have any dupes of ${options.dupes.length === 1 ? "that card" : "those cards"}`
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

module.exports = { missing, inventory };
