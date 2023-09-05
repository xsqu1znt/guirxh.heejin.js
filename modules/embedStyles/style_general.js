/** @typedef options_collectons
 * @property {GuildMember|User} target
 * @property {string} rarity
 * @property {string} setID
 * @property {string} category
 * @property {string} group
 * @property {"ascending"|"descending"} order */

const { GuildMember, User } = require("discord.js");

const BetterEmbed = require("../discordTools/dsT_betterEmbed");
const cardManager = require("../cardManager");
const _jsT = require("../jsTools/_jsT");

/** @param {options_collectons} options  */
function collections(user, options) {
	// prettier-ignore
	options = {
        target: null, rarity: null, setID: "",
        category: "", group: "",
        order: "ascending", ...options
    };

	/// Parse options
	// prettier-ignore
	options.rarity = options.rarity.split(",").map(str => str.trim().toLowerCase()).filter(str => str);
	// prettier-ignore
	options.setID = options.setID.split(",").map(str => str.trim().toLowerCase()).filter(str => str);
	// prettier-ignore
	options.category = options.category.split(",").map(str => str.trim().toLowerCase()).filter(str => str);
	// prettier-ignore
	options.group = options.group.split(",").map(str => str.trim().toLowerCase()).filter(str => str);

	// Fetch the cards from the bot
	let cards = _jsT.unique(cardManager.cards.all, "setID");

	// prettier-ignore
	let filtered = false;

	/// Apply collection filters
	// prettier-ignore
	if (options.rarity.length) {
		let _cards = [];
		for (let _rarity of options.rarity)_cards.push(...cards.filter(c => String(c.rarity).toLowerCase().includes(_rarity)));
		cards = _cards; filtered = true;
	}
	// prettier-ignore
	if (options.setID.length) {
		let _cards = [];
		for (let _setID of options.setID)_cards.push(...cards.filter(c => c.setID.toLowerCase().includes(_setID)));
		cards = _cards; filtered = true;
	}
	// prettier-ignore
	if (options.category.length) {
		let _cards = [];
		for (let _category of options.category)_cards.push(...cards.filter(c => c.category.toLowerCase().includes(_category)));
		cards = _cards; filtered = true;
	}
	// prettier-ignore
	if (options.group.length) {
		let _cards = [];
		for (let _group of options.group)_cards.push(...cards.filter(c => c.group.toLowerCase().includes(_group)));
		cards = _cards; filtered = true;
	}

	// prettier-ignore
	// Sort the cards
	cards.sort((a, b) => a.category - b.category || a.setID - b.setID || a.globalID - b.globalID);

	// Reverse the order of the cards, if needed
	if (options.order === "descending") cards.reverse();

	// prettier-ignore
	// Return an embed :: { ERROR }
	if (!cards.length) return new BetterEmbed({
		author: { text: "$USERNAME | collections", user },
		description: filtered ? "No sets were found with that search filter" : "There are no sets available"
	});

	/// Gather card global IDs
	let card_categories = [];

	for (let cat of cardManager.cards.category.names.all) {
		/// Parse the global IDs found into a format that includes its category name on the first element in the category
		let _globalIDs = cards.filter(c => c.category === cat).map(c => ({ name: "", globalID: c.globalID }));

		// NOTE: only pushes to the array if there were global IDs found
		if (_globalIDs.length) {
			// prettier-ignore
			// Gets the first element in the array and appends its category name
			let _globalID_first = {
				..._globalIDs.shift()
				// name: `${cardManager.cards.category.meta.base[cardManager.get.baseCategoryName(_globalIDs[0].globalID)].emoji} ${cat}`
			};

			_globalID_first.name = `\`${cardManager.cards.category.meta.base[cardManager.get.baseCategoryName(_globalID_first.globalID)].emoji}\` ${cat}`

			// Pushes to the main array
			card_categories.push(...[_globalID_first, ..._globalIDs]);
		}
	}

	/// Split global IDs by category, with a max of 5 cards per group
	let card_categories_split = [];
	let row_size = 5;

	for (let i = 0; i < card_categories.length; ) {
		// Get the base row size of 5
		let size = row_size;

		// Get an array of the next 5 entries
		let chunk_test = card_categories.slice(i, i + size);
		// Check if it contains an entrie with a category name
		let chunk_test_idx = chunk_test.findIndex(c => c.name);

		// Cut the row size down to the index of an entry before the category name
		// we don't need to subtract 1 from here to get the entry before index because we're using .slice()
		if (chunk_test_idx > 0) size = chunk_test_idx;

		// Push the resulting chunk to the array
		// since we're using .slice(), we need to make sure the size isn't 0 (the index of .findIndex())
		card_categories_split.push(chunk_test.slice(0, size || 1));

		// Increment i by size, defaulting to row size if 0 (the index of .findIndex())
		i += size || row_size;
	}

	/// Create the embeds :: { COLLECTION }
	let embeds_collection = [];
	// NOTE: 3 rows per page
	let card_categories_split_chunk = _jsT.chunk(card_categories_split, 3);

	for (let i = 0; i < card_categories_split_chunk.length; i++) {
		let _embed = new BetterEmbed({
			author: { text: "$USERNAME | collections", user, iconURL: true },
			description: "```lorem ipsum dolor sit amet```",
			footer: `Page: ${i + 1}/${card_categories_split_chunk.length} | Total: ${cards.length}`
		});

		/* - - - - - */
		for (let span_3_column of card_categories_split_chunk[i]) {
			/* - - - - - */
			_embed.addFields({
				name: span_3_column[0].name ? `***${span_3_column[0].name.toUpperCase()}***` : "\u200b",
				value: span_3_column.map(({ globalID }) => cardManager.toString.setEntry({ globalID })).join("\n\n"),
				inline: true
			});
		}

		embeds_collection.push(_embed);
	}

	return embeds_collection;
}

function gift(user, recipient, cards) {
	let cards_f = cards.map(c => cardManager.toString.basic(c));
	let card_last = cards.slice(-1)[0];

	// Create the embed :: { GIFT }
	let embed_gift = new BetterEmbed({
		author: { text: "$USERNAME | gift", user },
		description: `$GIFTED\n$FROM_TO`
			.replace("$GIFTED", cards.length > 5 ? `You gifted \`${cards.length}\` cards` : cards_f.join("\n"))
			.replace("$FROM_TO", `**From:** ${user}\n**To:** ${recipient}`),
		imageURL: card_last.imageURL
	});

	return embed_gift;
}

module.exports = { collections, gift };
