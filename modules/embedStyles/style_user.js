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
function inventory_ES(userData, options) {
	// prettier-ignore
	options = {
        target: null,
        setID: "", dupes: "",
        group: "", single: "", name: "",
        sorting: "setID", order: "ascending", ...options
    };

	/// Parse options
	options.setID = options.setID.split(",").map(str => str.trim().toLowerCase());
	options.dupes = options.dupes.split(",").map(str => str.trim().toLowerCase());
	options.group = options.group.split(",").map(str => str.trim().toLowerCase());
	options.single = options.single.split(",").map(str => str.trim().toLowerCase());
	options.name = options.name.split(",").map(str => str.trim().toLowerCase());

	if (options.dupes[0] === "all") options.dupes = ["all"];

	/// Parse user's card_inventory
	let cards = userParser.cards.getInventory(userData);
	let filtered = false;

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
	if (options.dupes.length) if (options.dupes[0] === "all")
        cards = cards.filter(c => c.duplicateCount);
    else
        cards = cards.filter(c => options.dupes.includes(c.card.globalID) && c.duplicateCount);

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
        description: filtered
            ? "No cards were found with that search filter"
            : "You do not have any cards in your inventory"
    });

	// prettier-ignore
	// Format the user's cards into list entries, with a max of 10 per page
	let cards_f = _jsT.chunk(cards.map(c => c.card_f), 10);

	/// Create the embeds :: { INVENTORY }
	let embeds_inventory = [];

	// prettier-ignore
	for (let i = 0, _chunk = cards_f[i]; i < _chunk.length; i++) embeds_inventory.push(
		new BetterEmbed({
			author: { text: "$USERNAME | inventory", user: options.target },
			description: _chunk.join("\n"),
			footer: { text: `Page ${i + 1}/${cards_f.length || 1} | Total: ${cards.length}` }
		})
    );

	return embeds_inventory;
}

module.exports = { inventory_ES };

/* function userInventory_ES(guildMember, userData, filter) {
    filter = { ...new uinv_filter(), ...filter }; userParser.cards.parseInventory(userData);

    // Apply card filters
    let cards = userParser.cards.getInventory(userData);
    let isFiltered = false;

    if (filter.setID) { cards = cards.filter(c => c.card.setID === filter.setID); isFiltered = true; }
    if (filter.group) { cards = cards.filter(c => c.card.group.toLowerCase().includes(filter.group)); isFiltered = true; }
    if (filter.name) { cards = cards.filter(c => c.card.name.toLowerCase().includes(filter.name)); isFiltered = true; }

    // Sort the cards
    switch (filter.sorting) {
        case "set": cards.sort((a, b) => a.card.setID - b.card.setID || a.card.globalID - b.card.globalID); break;

        case "global": cards.sort((a, b) => a.card.globalID - b.card.globalID); break;
    }

    if (filter.order === "descending") cards.reverse();

    /// Create the the inventory pages
    if (!cards.length) return [
        new BetterEmbed({
            author: { text: "%AUTHOR_NAME | inventory", user: guildMember },
            description: isFiltered
                ? "No cards were found with that search filter"
                : "You do not have anything in your inventory\n> Use \`/drop\` to get cards"
        })
    ];

    let cards_f = arrayTools.chunk(cards.map(card => card.card_f), 10);

    // Create the embeds
    let embeds = [];

    for (let i = 0; i < cards_f.length; i++) {
        let _embed = new BetterEmbed({
            author: { text: "%AUTHOR_NAME | inventory", user: guildMember },
            description: cards_f[i].join("\n"),
            footer: { text: `Page ${i + 1}/${cards_f.length || 1} | Total: ${cards.length}` }
        }); embeds.push(_embed);
    }

    // Return the embed array
    return embeds;
} */
