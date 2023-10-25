/** @typedef options_collectons
 * @property {GuildMember|User} target
 * @property {string} rarity
 * @property {string} setID
 * @property {string} category
 * @property {string} group
 * @property {"ascending"|"descending"} order */

/** @typedef {"uid"|"gid"|"set"|"idol"|"favorite"|"vault"|"team"} CardViewType */

const { GuildMember, User } = require("discord.js");

const { BetterEmbed, markdown } = require("../discordTools/_dsT");
const itemManager = require("../itemManager");
const cardManager = require("../cardManager");
const _jsT = require("../jsTools/_jsT");

const config = { bot: require("../../configs/config_bot.json") };

/** @param {GuildMember|User} user */
function shop(user) {
	/* - - - - - { Parse Cards } - - - - - */
	// Get shop cards and sort by global ID :: { ASCENDING }
	let _cards = {
		general: cardManager.cards.shop.general.filter(c => c.price !== null).sort((a, b) => a.globalID - b.globalID),
		special: cardManager.cards.shop.special.filter(c => c.price !== null).sort((a, b) => a.globalID - b.globalID)
	};

	// Sort cards by groups of similar set IDs
	let _card_sets = {
		general: cardManager.cards.shop.setIDs.general.map(setID => _cards.general.filter(c => c.setID === setID)),
		special: cardManager.cards.shop.setIDs.special.map(setID => _cards.special.filter(c => c.setID === setID))
	};

	/* - - - - - { Parse Item Packs } - - - - - */
	// Get card packs and sort by set ID :: { ASCENDING }
	/* let _itemPacks = {
		card: itemManager.items.cardPacks.general.sort((a, b) => a.setID - b.setID)
	}; */

	/* - - - - - { Parse Badges } - - - - - */
	// prettier-ignore
	// Sort badges by groups of similar set ID
	let _badges = itemManager.items.badges.general;

	/* - - - - - { Pages } - - - - - */
	// Create the embed :: { SHOP - TEMPLATE }
	let embed_shop = new BetterEmbed({ author: { text: "$USERNAME | shop", iconURL: true, user } });

	const shop_overview = () => {
		// Create the embed :: { SHOP - OVERVIEW }
		let _embed = embed_shop.copy({
			description: markdown.ansi("Welcome to the shop!", { text_color: "white", codeblock: true })
		});

		let _card_sets_f = {
			general: cardManager.cards.shop.setIDs.general.map(setID => cardManager.toString.setEntry({ setID })),
			special: cardManager.cards.shop.setIDs.special.map(setID => cardManager.toString.setEntry({ setID }))
		};

		let _itemPacks_f = {
			card: itemManager.items.cardPacks.setIDs.general.map(setID => itemManager.toString.cardPacks.setEntry(setID))
		};

		let _badges_f = itemManager.items.badges.setIDs.general.map(setID => itemManager.toString.badges.setEntry(setID));

		// Create an array of string with each available shop category
		// let shopCategories_f = [];

		/* - - - - - { Cards } - - - - - */
		// if (_card_sets_f.general.length) shopCategories_f.push(`**\`🃏\` Cards**\n${_card_sets_f.general.join("\n")}`);
		if (_card_sets_f.general.length) _embed.addFields({ name: "`🃏` Cards", value: _card_sets_f.general.join("\n") });
		// if (_card_sets_f.special.length) shopCategories_f.push(`**\`🃏\` Cards**\n${_card_sets_f.special.join("\n")}`);
		if (_card_sets_f.special.length) _embed.addFields({ name: "`🎀` Rewards", value: _card_sets_f.special.join("\n") });

		/* - - - - - { Items } - - - - - */
		// if (_itemPacks_f.card.length) shopCategories_f.push(`**\`📦\` Items**\n${_itemPacks_f.card.join("\n")}`);
		if (_itemPacks_f.card.length) _embed.addFields({ name: "`📦` Items", value: _itemPacks_f.card.join("\n") });

		/* - - - - - { Badges } - - - - - */
		// if (_badges_f.length) shopCategories_f.push(`**\`📛\` Badges**\n${_badges_f.join("\n")}`);
		if (_badges_f.length) _embed.addFields({ name: "`📛` Badges", value: _badges_f.join("\n") });

		/* // Create the embed :: { SHOP - OVERVIEW }
		return embed_shop.copy({
			description: shopCategories_f.length
				? shopCategories_f.join("\n\n")
				: "The shop is empty right now.\nCheck back later!"
		}); */

		if (!_embed.data.fields?.length) _embed.setDescription("The shop is empty right now.\nCheck back later!");

		// Return the shop overview
		return _embed;
	};

	// TODO: Group embeds by card set
	const shop_card = (special = false) => {
		// Format cards into strings
		let _card_sets_f = (special ? _card_sets.special : _card_sets.general).map(set =>
			set.map(c => cardManager.toString.shopEntry(c.globalID))
		);

		/* - - - - - { Split Large Card Sets (MAX=10) } - - - - - */
		let _card_set_chunks_f = [];

		// Chunk the array into groups of 10 and push each one to the final array
		for (let i = 0; i < _card_sets_f.length; i++)
			_jsT.chunk(_card_sets_f[i], 10).forEach(chunk => _card_set_chunks_f.push(chunk));

		/* - - - - - { Create the Embed Pages } - - - - - */
		let _embeds = [];

		for (let i = 0; i < _card_set_chunks_f.length; i++) {
			// Create the embed :: { Shop - Cards }
			let _embed = embed_shop.copy({
				description: _card_set_chunks_f[i].length ? _card_set_chunks_f[i].join("\n") : "This page is empty",
				footer: `Page ${i + 1}/${_card_set_chunks_f.length || 1}`
			});

			// prettier-ignore
			// Check if the page contains custom cards
			if (_embed.data.description.includes("custom"))
				_embed.setDescription(`${markdown.link("*Request customs in our server*", config.bot.community_server.INVITE_URL)}\n\n${_embed.data.description}`)

			_embeds.push(_embed);
		}

		// Return the embed array
		return _embeds;
	};

	const shop_badges = () => {
		// Format badges into strings
		let _badges_f = _badges.map(b => itemManager.toString.badges.shopEntry(b.id));

		/* - - - - - { Split Large Badges Sets (MAX=10) } - - - - - */
		let _badges_chunks_f = _jsT.chunk(_badges_f, 10);

		/* - - - - - { Create the Embed Pages } - - - - - */
		let _embeds = [];

		for (let i = 0; i < _badges_chunks_f.length; i++) {
			// Create the embed :: { Shop - Badges }
			let _embed = embed_shop.copy({
				description: _badges_chunks_f[i].length ? _badges_chunks_f[i].join("\n") : "This page is empty",
				footer: `Page ${i + 1}/${_badges_chunks_f.length || 1}`
			});

			_embeds.push(_embed);
		}

		// Return the embed array
		return _embeds;
	};

	return shop_badges(true);
}

/** @param {GuildMember|User} user @param {options_collectons} options */
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
		for (let _rarity of options.rarity) _cards.push(...cards.filter(c => String(c.rarity).toLowerCase().includes(_rarity)));
		cards = _cards; filtered = true;
	}
	// prettier-ignore
	if (options.setID.length) {
		let _cards = [];
		for (let _setID of options.setID) _cards.push(...cards.filter(c => c.setID.toLowerCase().includes(_setID)));
		cards = _cards; filtered = true;
	}
	// prettier-ignore
	if (options.category.length) {
		let _cards = [];
		for (let _category of options.category) _cards.push(...cards.filter(c => c.category.toLowerCase().includes(_category)));
		cards = _cards; filtered = true;
	}
	// prettier-ignore
	if (options.group.length) {
		let _cards = [];
		for (let _group of options.group) _cards.push(...cards.filter(c => c.group.toLowerCase().includes(_group)));
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
	// Gets the category names in order
	let category_names_all = cardManager.cards.category.names.all;
	// Reverse said order so special cards come first
	category_names_all.reverse();

	for (let cat of category_names_all) {
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

			_globalID_first.name = `\`${
				cardManager.cards.category.meta.base[cardManager.get.baseCategoryName(_globalID_first.globalID)].emoji
			}\` ***${cat}***`;

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
		let chunk_test_find = chunk_test[chunk_test_idx];

		// Check again if the 1st entry had a category name
		if (chunk_test_idx === 0) chunk_test_idx = chunk_test.findIndex(c => c.name && c.name !== chunk_test_find.name);

		// Cut the row size down to the index of an entry before the category name
		// we don't need to subtract 1 from here to get the entry before index because we're using .slice()
		if (chunk_test_idx > 0) size = chunk_test_idx;

		// Push the resulting chunk to the array
		// since we're using .slice(), we need to make sure the size isn't 0 (the index of .findIndex())
		let chunk = chunk_test.slice(0, size || 1);

		card_categories_split.push(chunk);

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
				name: span_3_column[0].name ? span_3_column[0].name.toUpperCase() : "\u200b",
				value: span_3_column.map(({ globalID }) => cardManager.toString.setEntry({ globalID })).join("\n\n"),
				inline: true
			});
		}

		embeds_collection.push(_embed);
	}

	return embeds_collection;
}

/** @param {GuildMember|User} user @param {UserData} userData @param {Card} card @param {CardViewType} viewType */
function view(user, userData, card, viewType) {
	const embed_viewUID = () => {
		// Whether or not this card is selected, favorited, or on the user's team
		let selected = card.uid === userData.card_selected_uid;
		let favorite = card.uid === userData.card_favorite_uid;
		let onTeam = userData.card_team_uids.includes(card.uid);

		// let duplicate_count = (await userManager.inventory.get(user.id, { gids: card.globalID }))?.length || 0;

		// prettier-ignore
		let card_f = cardManager.toString.inventoryEntry(card, {
			duplicate: duplicate_count,
			locked: card.locked, selected, favorite, onTeam,
			showXP: true
		});

		// prettier-ignore
		return new BetterEmbed({
			description: card_f, author: { text: "$USERNAME | view", user, iconURL: true },
			imageURL: card.imageURL
		});
	};

	const embed_viewGID = () => {
		return new BetterEmbed({
			description: cardManager.toString.inventoryEntry(card),
			author: { text: "$USERNAME | view", user, iconURL: true },
			imageURL: card.imageURL
		});
	};

	const embed_viewSet = () => {
		// Sort the cards by global ID and split it
		let _cards = card.sort((a, b) => a.globalID - b.globalID);

		/** @type {BetterEmbed[]} */
		let embeds = [];

		_cards.forEach((_card, idx) => {
			// Create the embed
			let _embed = new BetterEmbed({
				description: cardManager.toString.inventoryEntry(_card, { simplify: true }),
				author: { text: `$USERNAME | ${_card.group} - ${_card.single}`, user, iconURL: true },
				footer: `Card ${idx + 1}/${_cards.length}`,
				imageURL: _card.imageURL
			});

			embeds.push(_embed);
		});

		return embeds;
	};

	const embed_viewIdol = () => {
		// Whether or not this card is favorited, or on the user's team
		let favorite = card.uid === userData.card_favorite_uid;
		let onTeam = userData.card_team_uids.includes(card.uid);

		// prettier-ignore
		let card_f = cardManager.toString.inventoryEntry(card, {
			locked: card.locked, selected: true, favorite, onTeam, showXP: true
		});

		// prettier-ignore
		return new BetterEmbed({
			description: card_f, author: { text: "$USERNAME | idol", user, iconURL: true },
			imageURL: card.imageURL
		});
	};

	const embed_viewFavorite = () => {
		// Whether or not this card is selected, or on the user's team
		let selected = card.uid === userData.card_selected_uid;
		let onTeam = userData.card_team_uids.includes(card.uid);

		// prettier-ignore
		let card_f = cardManager.toString.inventoryEntry(card, {
			locked: card.locked, selected, favorite: true, onTeam, showXP: true
		});

		// prettier-ignore
		return new BetterEmbed({
			description: card_f, author: { text: "$USERNAME | favorite", user, iconURL: true },
			imageURL: card.imageURL
		});
	};

	const embed_viewVault = () => {
		// Sort the cards by set ID and global ID, then group them by 10 per embed
		// let cards = _jsT.chunk(card.sort((a, b) => a.setID - b.setID || a.globalID - b.globalID), 15);
		let cards = card.sort((a, b) => a.setID - b.setID || a.globalID - b.globalID);

		// Parse the cards into strings, and group them by 15 per page
		let cards_f = _jsT.chunk(
			cards.map(c => {
				// Whether or not this card is selected, favorited, or on the user's team
				let selected = card.uid === userData.card_selected_uid;
				let favorite = card.uid === userData.card_favorite_uid;
				let onTeam = userData.card_team_uids.includes(card.uid);

				return cardManager.toString.inventoryEntry(c, { locked: true, selected, favorite, onTeam });
			}),
			15
		);

		/** @type {BetterEmbed[]} */
		let embeds = [];

		for (let i = 0; i < cards_f.length; i++) {
			/// Create the embed
			let _embed = new BetterEmbed({
				author: { text: "$USERNAME | vault", user, iconURL: true },
				description: markdown.ansi(`Total: ${cards.length}`, {
					text_color: "white",
					format: "bold",
					codeblock: true
				}),
				footer: `Page ${i + 1}/${cards_f.length}`
			});

			_embed.addFields(...cards_f[i].map(c => ({ name: "\u200b", value: c, inline: true })));

			embeds.push(_embed);
		}

		return embeds;
	};

	const embed_viewTeam = () => {
		// Sort the cards by global ID and split it
		let cards = card.sort((a, b) => a.globalID - b.globalID);

		let total_ability = _jsT.sum(cards, "stats.ability");
		let total_reputation = _jsT.sum(cards, "stats.reputation");

		/** @type {BetterEmbed[]} */
		let embeds = [];

		cards.forEach((_card, idx) => {
			// Create the embed
			let _embed = new BetterEmbed({
				description: cardManager.toString.inventoryEntry(_card, { simplify: true }),
				author: { text: "$USERNAME | team", user, iconURL: true },
				footer: `Card ${idx + 1}/${cards.length} | Total :: ABI. %TOTAL_ABI / REP. %TOTAL_REP`
					.replace("%TOTAL_ABI", total_ability)
					.replace("%TOTAL_REP", total_reputation),
				imageURL: _card.imageURL
			});

			embeds.push(_embed);
		});

		return embeds;
	};

	// prettier-ignore
	switch (viewType) {
		case "uid": return embed_viewUID();
		case "gid": return embed_viewGID();
		case "set": return embed_viewSet();
		case "idol": return embed_viewIdol();
		case "favorite": return embed_viewFavorite();
		case "vault": return embed_viewVault();
		case "team": return embed_viewTeam();
	}
}

/** @param {GuildMember|User} user @param {GuildMember|User} recipient @param {Card[]} cards */
function gift(user, recipient, cards) {
	let from_to = `**From:** ${user}\n**To:** ${recipient}`;

	let cards_f = cards.map(c => cardManager.toString.inventoryEntry(c, { simplify: true }));
	let card_last = cards.slice(-1)[0];

	// Create the embed :: { GIFT }
	let embed_gift = new BetterEmbed({
		author: { text: "$USERNAME | gift", user },
		description: `$GIFTED\n$FROM_TO`
			.replace("$GIFTED", `You gifted \`${cards.length}\` cards`)
			.replace("$FROM_TO", from_to),
		imageURL: card_last.imageURL
	});

	if (cards.length <= 6) {
		embed_gift.addFields(...cards_f.map(f => ({ name: "\u200b", value: f, inline: true })));
		embed_gift.options.description = from_to;
	}

	return embed_gift;
}

module.exports = { shop, collections, view, gift };
