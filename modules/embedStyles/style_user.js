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
const userParser = require("../userParser");
const _jsT = require("../jsTools/_jsT");

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
	options.setID = options.setID.split(",").filter(str => str).map(str => str.trim().toLowerCase());
	// prettier-ignore
	options.dupes = options.dupes.split(",").filter(str => str).map(str => str.trim().toLowerCase());
	// prettier-ignore
	options.group = options.group.split(",").filter(str => str).map(str => str.trim().toLowerCase());
	// prettier-ignore
	options.single = options.single.split(",").filter(str => str).map(str => str.trim().toLowerCase());
	// prettier-ignore
	options.name = options.name.split(",").filter(str => str).map(str => str.trim().toLowerCase());

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
	if (options.setID.length) { cards = cards.filter(c => options.setID.includes(c.card.setID)); filtered = true; }
	// prettier-ignore
	if (options.group.length) { cards = cards.filter(c => options.group.includes(c.card.group)); filtered = true; }
	// prettier-ignore
	if (options.single.length) { cards = cards.filter(c => options.single.includes(c.card.single)); filtered = true; }
	// prettier-ignore
	if (options.name.length) { cards = cards.filter(c => options.name.includes(c.card.name)); filtered = true; }

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
            thumbnailURL: dupeCheck ? cards[0].card.imageURL : null,
			description: cards_f[i].join("\n"),
			footer: { text: `Page ${i + 1}/${cards_f.length || 1} | Total: ${cards.length}` }
		})
    );

	return embeds_inventory;
}

module.exports = { inventory };
