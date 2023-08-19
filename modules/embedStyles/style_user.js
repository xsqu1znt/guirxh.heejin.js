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
const { userManager } = require("../mongo/index");
const badgeManager = require("../badgeManager");
const cardManager = require("../cardManager");
const userParser = require("../userParser");
const _jsT = require("../jsTools/_jsT");

const config_player = require("../../configs/config_player.json");
const config_bot = require("../../configs/config_bot.json");

async function profile(user, userData) {
	// prettier-ignore
	let [card_favorite, card_selected] = await userManager.inventory.get(user.id,
		[userData.card_favorite_uid, userData.card_selected_uid]
	);

	let inventory_count = await userManager.inventory.count(user.id, true);

	const embed_main = () => {
		let _embed = new BetterEmbed({
			author: { text: "$USERNAME | profile", user },
			thumbnailURL: card_selected?.imageURL
		});

		// Add the user's biography if they have one
		if (userData.biography) _embed.addFields({ name: "`👤` Biography", value: userData.biography });

		// Add the user's information
		_embed.addFields({
			name: "`📄` Information",
			value: "> `$CARROTS` :: `$RIBBONS` :: `🃏 $INVENTORY_COUNT/$CARD_COUNT` :: `📈 LV. $LEVEL ☝️ $XPXP/$XP_NEEDEDXP`"
				.replace("$CARROTS", `${config_bot.emojis.CURRENCY_1.EMOJI} ${userData.balance || 0}`)
				.replace("$RIBBONS", `${config_bot.emojis.CURRENCY_2.EMOJI} ${userData.ribbons || 0}`)

				.replace("$INVENTORY_COUNT", inventory_count || 0)
				.replace("$CARD_COUNT", cardManager.cardCount || 0)

				.replace("$LEVEL", userData.level || 0)

				.replace("$XP", userData.xp || 0)
				.replace("$XP_NEEDED", userData.xp_for_next_level || 0)
		});

		return _embed;
	};

	const embed_badges = () => {
		let _embed = new BetterEmbed({ author: { text: "$USERNAME | profile", user } });

		// let _badge_sets = _jsT.unique(badgeManager.badges, "set");

		// Convert the BadgeLike objects to full badges
		let _badges_f = userData.badges.map(b => badgeManager.toString.profile(b.id));
		// Add the badges to the embed
		_embed.addFields([{ name: "`📛` Badges", value: _badges_f.join("\n") }]);

		return _embed;
	};

	const embed_card = card => {
		let selected = card.uid === card_selected;
		let favorited = card.uid === card_favorite;
		let onTeam = userData.card_team_uids.includes(card.uid);

		// Parse the card into a string
		let card_f = cardManager.toString.inventory(card, { selected, favorited, onTeam });

		let _embed = new BetterEmbed({
			author: { text: "$USERNAME | profile", user },
			imageURL: card?.imageURL,
			description: card_f
		});

		return _embed;
	};

	const embed_inventory_stats = async () => {
		let _embed = new BetterEmbed({ author: { text: "$USERNAME | profile", user } });

		// Get the name of each card category
		let categories = Object.keys(cardManager.cards);

		/// Count how many cards the user has out of each category
		// prettier-ignore
		/* let cards_user_count = await Promise.all(categories.map(async category => {
			// Get the global IDs for every card in the category
			let _globalIDs = cardManager.cards[category].map(c => c.globalID);

			// Check how many cards the user has out of the global ID array
			let _count = (await userManager.inventory.has(user.id, _globalIDs)).filter(b => b).length;

			return { category, has: _count, outOf: _globalIDs.length };
		})); */

		// Format the categories into a string
		let cards_user_count_f = cards_user_count.map(c => `> 🃏 **${c.category}**: \`${c.has}/${c.outOf}\``);

		// Add fields to the embed
		_embed.addFields(
			{ name: "`🌕` Normal Sets", value: cards_user_count_f.slice(0, 5).join("\n"), inline: true },
			{ name: "`🌗` Special Sets", value: cards_user_count_f.slice(5).join("\n"), inline: true }
		);

		return _embed;
	};

	return {
		main: embed_main(),
		badges: userData.badges?.length ? embed_badges() : null,
		favorited: card_favorite ? embed_card(card_favorite) : null,
		selected: card_selected ? embed_card(card_selected) : null,
		stats: await embed_inventory_stats()
	};
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
function inventory(userData, options, inventory_stats) {
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
	// Format the user's cards into list entries, with a max of 9 per page
	let cards_f = _jsT.chunk(cards.map(c => c.card_f), 10);

	/// Create the embeds :: { INVENTORY }
	let embeds_inventory = [];

	let cat_icons_1 = ["🔴", "🟡", "🟢", "🔵", "🟣"];
	let cat_icons_2 = ["🟦", "🟨", "🟥", "🟩", "⬜", "🟪"];

	// prettier-ignore
	let stats_1 = inventory_stats.slice(0, 5).map((c, idx) => `> **\`${cat_icons_1[idx]} ${c.category.toUpperCase()}\`** \`${c.has}/${c.outOf}\``);
	stats_1.push(`> **\`⚪ TOTAL:\`** **\`${cards.length}\`**`);

	// prettier-ignore
	let stats_2 = inventory_stats.slice(5).map((c, idx) => `> **\`${cat_icons_2[idx]} ${c.category.toUpperCase()}\`** \`${c.has}/${c.outOf}\``);

	let extra_fields = [
		{ name: "\u200b", value: stats_1.join("\n"), inline: true },
		{ name: "\u200b", value: stats_2.join("\n"), inline: true }
	];

	for (let i = 0; i < cards_f.length; i++) {
		let _embed = new BetterEmbed({
			author: { text: dupeCheck ? "$USERNAME | dupes" : "$USERNAME | inventory", user: options.target },
			thumbnailURL: dupeCheck ? cards.slice(-1)[0].card.imageURL : null
			// description: cards_f[i].join("\n"),
			// description: `\`\`\`Inventory Page ${i + 1}\`\`\``,
			// footer: { text: `Page ${i + 1}/${cards_f.length || 1} | Total: ${cards.length}` }
		});

		_embed.addFields(
			extra_fields[0],

			...cards_f[i].slice(0, 1).map(c_f => ({ name: "\u200b", value: c_f, inline: true })),

			extra_fields[1],

			...cards_f[i].slice(1).map(c_f => ({ name: "\u200b", value: c_f, inline: true }))
		);

		// _embed.addFields(...cards_f[i].map(c_f => ({ name: "\u200b", value: c_f, inline: true })));

		embeds_inventory.push(_embed);
	}

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

function reminders(user, userData) {
	// Get the cooldown names from the player config
	let cooldowns = Object.keys(config_player.cooldowns);

	// Parse the cooldowns into strings
	let cooldowns_f = cooldowns.map(cd => {
		let _enabled = userData.reminders.find(r => r.type === cd.toLowerCase())?.enabled || false;
		let _cooldown_f = _jsT.toTitleCase(cd.replace(/_/g, " "));

		return `\`${_enabled ? "✔️ enabled" : "❌ disabled"}\` **${_cooldown_f}**`;
	});

	// Create the embed :: { REMINDERS }
	let embed_reminders = new BetterEmbed({
		author: { text: "$USERNAME | reminder", user },
		description: cooldowns_f.join("\n")
	});

	return embed_reminders;
}

module.exports = { profile, missing, inventory, cooldowns, reminders };
