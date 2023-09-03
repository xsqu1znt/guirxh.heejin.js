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
	let cards_category_names = _jsT.unique(cards.map(c => c.category));

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

	// Get the cards in each category
	let card_categories = cards_category_names.map(cat => {
		let _cards = cards.filter(c => c.category === cat).map(c => c.globalID);
		return { name: cat, card_chunks: _jsT.chunk(_cards, 10) };
	});

	/// Create the embeds :: { COLLECTION }
	let embeds_collections = [];

	for (let cat of card_categories) {
		if (cat.card_chunks.length > 3) {
			for (let _chunk of _jsT.chunk(cat.card_chunks, 3)) {
				for (let _cards_chunk of _chunk) {
					let _embed = new BetterEmbed({
						author: { text: "$USERNAME | collections", user, iconURL: true },
						description: "```lorem ipsum dolor sit amet```"
					});

					for (let _card of _cards_chunk)
						_embed.addFields({ name: "\u200b", value: cardManager.toString.setEntry(_card), inline: true });

					embeds_collections.push(_embed);
				}
			}
		} else {
			let _embed = new BetterEmbed({
				author: { text: "$USERNAME | collections", user, iconURL: true },
				description: "```lorem ipsum dolor sit amet```"
			});

			for (let _chunk of cat.card_chunks)
				for (let _card of _chunk)
					_embed.addFields({ name: "\u200b", value: cardManager.toString.setEntry(_card), inline: true });

			embeds_collections.push(_embed);
		}
	}

	return embeds_collections;

	/* /// Group sets by their category
	let cards_stage_1 = category_names.map(cat =>
		cards
			.filter(c => c.category === cat)
			// Format the cards into a string
			.map(c => cardManager.toString.setEntry(c))
	);

	// group by 10
	let cards_stage_2 = cards_stage_1.map(c_f_arr => _jsT.chunk(c_f_arr, 10));

	// group by 2, per page
	let cards_stage_3 = cards_stage_2.map(c_f_arr_10 => _jsT.chunk(c_f_arr_10, 2));

	/// Create the embeds :: { INVENTORY }
	let embeds_collections = [];

	for (let i = 0; i < cards_stage_3.length; i++) {
		let _chunk_2 = cards_stage_3[i];

		for (let _chunk_10_group of _chunk_2) {
			let _embed = new BetterEmbed({
				author: { text: "$USERNAME | collections", user, iconURL: true },
				description: "```lorem ipsum dolor sit amet```"
			});

			// prettier-ignore
			for (let _chunk_10_f of _chunk_10_group)
				_embed.addFields({ name: `***${category_names[i]}***`, value: `>>> ${_chunk_10_f.join("\n")}`, inline: true });

			embeds_collections.push(_embed);
		}
	}

	// Add page numbering to the embed's footer
	for (let i = 0; i < embeds_collections.length; i++)
		embeds_collections[i].setFooter({
			text: `Page ${i + 1}/${embeds_collections.length || 1} | Total: ${cards.length}`
		});

	return embeds_collections; */
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
