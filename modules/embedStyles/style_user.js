/** @typedef options_profile
 * @property {UserData} userData
 * @property {Card} card_selected
 * @property {Card} card_favorite
 * @property {UserInventoryStats} inventoryStats */

/** @typedef options_inventory
 * @property {GuildMember|User} target
 * @property {string} rarity
 * @property {string} setID
 * @property {string} globalID
 * @property {string} category
 * @property {string} group
 * @property {string} single
 * @property {string} name
 * @property {"gid"|"setID"|"recent"} sorting
 * @property {"ascending"|"descending"} order */

/** @typedef options_missing
 * @property {{set:Card[], has:boolean[]}} cards */

const { GuildMember, User, time, TimestampStyles } = require("discord.js");

const { BetterEmbed, markdown } = require("../discordTools");
const { userManager, questManager } = require("../mongo/index");
const cardManager = require("../cardManager");
const itemManager = require("../itemManager");
const userParser = require("../userParser");
const jt = require("../jsTools");

const config_player = require("../../configs/config_player.json");
const config_bot = require("../../configs/config_bot.json");

const config = {
	bot: require("../../configs/config_bot.json"),
	player: require("../../configs/config_player.json")
};

/** @param {GuildMember|User} user @param {options_profile} options */
function profile(user, options) {
	options = { userData: null, card_selected: null, card_favorite: null, inventoryStats: null, ...options };

	let embed_profile = new BetterEmbed({ author: { text: "$USERNAME | profile", user, iconURL: true } });

	const profile_overview = () => {
		let embed = embed_profile.copy({ thumbnailURL: options.card_selected?.imageURL });

		// prettier-ignore
		// Add the user's biography if they have one
		if (options.userData.biography) embed.addFields({
			name: "`👤` Biography", value: `> ${options.userData.biography}`,
		});

		/* - - - - - { General Information } - - - - - */
		embed.addFields(
			{
				name: "`🪙` Balance",
				value: markdown.ansi(
					"$BALANCE\n$RIBBON"
						.replace("$BALANCE", `${config.bot.emojis.currency_1.EMOJI} ${options.userData.balance || 0}`)
						.replace("$RIBBON", `${config.bot.emojis.currency_2.EMOJI} ${options.userData.ribbons || 0}`),
					{ format: "bold", text_color: "white", codeblock: true }
				),
				inline: true
			},

			{
				name: "`📊` Level",
				value: markdown.ansi(
					"📈 $LEVEL\n👆 $XP/$XP_NEEDEDXP"
						.replace("$LEVEL", options.userData.level)
						.replace("$XP", options.userData.xp)
						.replace("$XP_NEEDED", options.userData.xp_for_next_level),
					{ format: "bold", text_color: "white", codeblock: true }
				),
				inline: true
			}
		);

		return embed;
	};

	const profile_charms = () => {
		if (!options.userData?.charms) return null;

		let charms_active = Object.values(options.userData.charms).filter(c => c.expiration >= Date.now());
		if (!charms_active) return null;

		let charms_f = charms_active.map(c => itemManager.toString.charms.profile(c));
		return charms_f.length ? embed_profile.copy({ description: `>>> ${charms_f.join("\n")}` }) : null;
	};

	const profile_badges = () => {
		if (!options.userData?.badges?.length) return null;

		let badges_f = options.userData.badges.map(b => itemManager.toString.badges.profile(b));
		return badges_f.length ? embed_profile.copy({ description: `>>> ${badges_f.join("\n")}` }) : null;
	};

	const profile_cardView = card => {
		if (!card) return null;

		let selected = card.uid === options?.card_selected?.uid;
		let favorite = card.uid === options?.card_favorite?.uid;
		let onTeam = options.userData.card_team_uids.includes(card?.uid);

		// prettier-ignore
		// Format the card into a string
		let card_f = cardManager.toString.inventoryEntry(card, {
			selected, favorite, onTeam,
			locked: card.locked, showXP: true
		});

		return embed_profile.copy({ description: card_f, imageURL: card.imageURL });
	};

	const profile_inventoryStats = () => {
		let embed = embed_profile.copy();

		let stats_f = options.inventoryStats.categories.map(cat =>
			markdown.ansi(`${cardManager.cards.category.meta.base[cat.name].emoji} ${cat.name}: ${cat.has}/${cat.outOf}`, {
				format: "bold",
				text_color: cardManager.cards.category.meta.base[cat.name].color_ansi
			})
		);

		// prettier-ignore
		// Insert inventory count
		stats_f.splice(5, 0,
			markdown.ansi(`⚪ total: ${options.inventoryStats.count.has}/${options.inventoryStats.count.outOf}`, {
				format: "bold", text_color: "white"
			})
		);

		embed.addFields(
			{
				name: "`🌕` Normal Sets",
				value: `\`\`\`ansi\n${stats_f.slice(0, 6).join("\n")}\`\`\``,
				inline: true
			},
			{
				name: "`🌗` Special Sets",
				value: `\`\`\`ansi\n${stats_f.slice(6).join("\n")}\`\`\``,
				inline: true
			}
		);

		return embed;
	};

	let embeds = {
		// Overview
		overview: profile_overview(),
		// Badges
		badges: profile_badges(),
		// Charms
		charms: profile_charms(),
		// Card Selected
		card_selected: profile_cardView(options.card_selected),
		// Card Favorite
		card_favorite: profile_cardView(options.card_favorite),
		// Inventory Stats
		inventoryStats: profile_inventoryStats()
	};

	let navigationData = [];

	if (embeds.overview) navigationData.push({ label: "📄 Overview", description: "View your profile overview" });
	if (embeds.badges) navigationData.push({ label: "📛 Badges", description: "View your badges" });
	if (embeds.charms) navigationData.push({ label: "✨ Charms", description: "View your charms" });
	if (embeds.card_selected) navigationData.push({ label: "🏃 Stage Idol", description: "View your stage idol" });
	if (embeds.card_favorite) navigationData.push({ label: "⭐ Favorite Card", description: "View your favorite" });
	// prettier-ignore
	if (embeds.inventoryStats) navigationData.push({ label: "🃏 Inventory Details", description: "View your inventory details" });

	// prettier-ignore
	return {
		embeds: [
			embeds.overview,
			embeds.badges,
			embeds.charms,
			embeds.card_selected,
			embeds.card_favorite,
			embeds.inventoryStats
		].filter(bE => bE),

		navigationData
	};
}

/** @param {GuildMember|User} user @param {options_missing} options */
function missing(user, target, cards, cards_has) {
	// Sort the cards by set ID then global ID :: { DESCENDING }
	cards.sort((a, b) => a.setID - b.setID || a.globalID - b.globalID);
	// Format the user's cards into list entries, with a max of 10 per page
	let cards_f = cards.map((c, idx) => cardManager.toString.missingEntry(c, cards_has[idx]));
	// Limit to 9 cards per page
	let cards_f_chunk = jt.chunk(cards_f, 9);

	/* - - - - - { Create the Embeds } - - - - - */
	let _has_count = cards_has.filter(b => b).length;
	let embeds_missing = [];

	// Create the embed template :: { MISSING }
	let embed_missing = new BetterEmbed({ author: { text: "$USERNAME | missing", user, iconURL: true } });

	for (let i = 0; i < cards_f_chunk.length; i++) {
		let _embed = embed_missing.copy({
			description: `**\`\`\`⬜ $SET_ID | 🃏 $HAS/$OUT_OF $TARGET_USERNAME\`\`\`**`
				.replace("$SET_ID", cards[0].setID)
				.replace("$HAS", _has_count)
				.replace("$OUT_OF", cards_has.length)
				.replace("$TARGET_USERNAME", target.id !== user.id ? `| 🔎 ${target.username}` : ""),
			footer: `Page ${i + 1}/${cards_f_chunk.length || 1}`
		});

		// Add the missing entries as fields
		_embed.addFields(...cards_f_chunk[i].map(c => ({ name: "\u200b", value: c, inline: true })));

		embeds_missing.push(_embed);
	}

	return embeds_missing;
}

/** @param {options_inventory} options  */
function inventory(userData, options, stats) {
	// prettier-ignore
	options = {
		target: null,
		rarity: "", setID: "", globalID: "",
		category: "", group: "", single: "", name: "",
		sorting: "setID", order: "ascending", ...options
	};

	/* - - - - - { Parse Options } - - - - - */
	// prettier-ignore
	options.rarity = options.rarity.split(",").map(str => str.trim().toLowerCase());
	// prettier-ignore
	options.setID = options.setID.split(",").map(str => str.trim().toLowerCase());
	// prettier-ignore
	options.globalID = options.globalID.split(",").map(str => str.trim().toLowerCase());
	// prettier-ignore
	options.category = options.category.split(",").map(str => str.trim().toLowerCase());
	// prettier-ignore
	options.group = options.group.split(",").map(str => str.trim().toLowerCase());
	// prettier-ignore
	options.single = options.single.split(",").map(str => str.trim().toLowerCase());
	// prettier-ignore
	options.name = options.name.split(",").map(str => str.trim().toLowerCase());

	/// Parse user's card_inventory
	let cards = userParser.cards.getInventory(userData, {
		dupe: options.globalID.length && options.globalID[0] !== "all" ? false : true,
		unique: options.globalID.length && options.globalID[0] !== "all" ? false : true
	});

	// prettier-ignore
	let filtered = false, dupeCheck = false;

	/// Apply inventory filters
	// prettier-ignore
	if (options.rarity.length) {
		let _cards = [];
		for (let _rarity of options.rarity) _cards.push(...cards.filter(c => String(c.card.rarity).toLowerCase().includes(_rarity)));
		cards = _cards; filtered = true;
	}
	// prettier-ignore
	if (options.setID.length) {
		let _cards = [];
		for (let _setID of options.setID) _cards.push(...cards.filter(c => c.card.setID.toLowerCase().includes(_setID)));
		cards = _cards; filtered = true;
	}
	// prettier-ignore
	if (options.category.length) {
		let _cards = [];
		for (let _category of options.category) _cards.push(...cards.filter(c => c.card.category.toLowerCase().includes(_category)));
		cards = _cards; filtered = true;
	}
	// prettier-ignore
	if (options.group.length) {
		let _cards = [];
		for (let _group of options.group) _cards.push(...cards.filter(c => c.card.group.toLowerCase().includes(_group)));
		cards = _cards; filtered = true;
	}
	// prettier-ignore
	if (options.single.length) {
		let _cards = [];
		for (let _single of options.single) _cards.push(...cards.filter(c => c.card.single.toLowerCase().includes(_single)));
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
	if (options.globalID.length) if (options.globalID[0].toLowerCase() === "all") {
		cards = cards.filter(c => c.duplicate);
		filtered = true;
	} else {
		cards = cards.filter(c => options.globalID.includes(c.card.globalID) && c.duplicate);
		filtered = true; dupeCheck = true;
	}

	// prettier-ignore
	// Sort the user's cards
	switch (options.sorting) {
		case "gid": cards.sort((a, b) => a.card.globalID - b.card.globalID); break;
		case "setID": cards.sort((a, b) => a.card.setID - b.card.setID || a.card.globalID - b.card.globalID); break;
		case "recent": break;
	}

	// Reverse the order of the user's cards, if needed
	if (options.order === "descending") cards.reverse();

	// prettier-ignore
	// Return an embed :: { ERROR }
	if (!cards.length) return {
		embed_error: new BetterEmbed({
			author: { text: "$USERNAME | inventory", user: options.target, iconURL: true },
			description: filtered ? dupeCheck
				? `You do not have any dupes of ${options.globalID.length === 1 ? "that card" : "those cards"}`
				: "No cards were found with that search filter"
				: "There are no cards in your inventory"
		})
	};

	// prettier-ignore
	// Format the user's cards into list entries, with a max of 15 per page
	let cards_f = jt.chunk(cards.map(c => c.card_f), 15);

	return; // DEBUG

	/// Create the embeds :: { INVENTORY }
	let embeds_inventory = [];

	// prettier-ignore
	let stats_f_1 = stats.slice(0, 5).map(c =>
		markdown.ansi(`${cardManager.cards.category.meta.base[c.name].emoji} ${c.name}: ${c.has}/${c.outOf}`, {
			format: "bold", text_color: cardManager.cards.category.meta.base[c.name].color_ansi
		})
	);

	// Add the user's inventory count to the first stat section
	stats_f_1.push(markdown.ansi(`⚪ total: ${cards.length}`, { format: "bold", text_color: "white" }));

	// prettier-ignore
	let stats_f_2 = stats.slice(5).map(c =>
		markdown.ansi(`${cardManager.cards.category.meta.base[c.name].emoji} ${c.name}: ${c.has}/${c.outOf}`, {
			format: "bold", text_color: cardManager.cards.category.meta.base[c.name].color_ansi
		})
	);

	/* - - - - - { PROFILE STATS } - - - - - */
	// let stats_profile = "> `$CARROTS` :: `$RIBBONS` :: `🃏 $INVENTORY_COUNT/$CARD_COUNT` :: `📈 LV. $LEVEL ☝️ $XPXP/$XP_NEEDEDXP`"
	let stats_profile = markdown.ansi(
		"$CARROTS\n$RIBBONS\n📆 $DAILY_STREAK\n📈 $LEVEL\n☝️ $XP/$XP_NEEDEDXP\n🃏 $INVENTORY_COUNT/$CARD_COUNT"
			.replace("$CARROTS", `${config_bot.emojis.currency_1.EMOJI} ${userData.balance || 0}`)
			.replace("$RIBBONS", `${config_bot.emojis.currency_2.EMOJI} ${userData.ribbons || 0}`)

			.replace("$DAILY_STREAK", userData.daily_streak || 0)
			.replace("$LEVEL", userData.level || 0)

			.replace("$XP", Math.floor(userData.xp || 0))
			.replace("$XP_NEEDED", Math.floor(userData.xp_for_next_level || 0))

			.replace("$INVENTORY_COUNT", cards.length || 0)
			.replace("$CARD_COUNT", cardManager.cards.count || 0),

		{ format: "bold", text_color: "white" }
	);

	for (let i = 0; i < cards_f.length; i++) {
		let _embed = new BetterEmbed({
			author: {
				text: dupeCheck ? "$USERNAME | dupes" : `$USERNAME | inventory ${filtered ? "(filtered)" : ""}`,
				user: options.target,
				iconURL: true
			},
			thumbnailURL: dupeCheck ? cards.slice(-1)[0].card.imageURL : null,
			// description: `\`\`\`lorem ipsum dolor sit amet\`\`\``,
			footer: { text: `Page ${i + 1}/${cards_f.length || 1}` }
		});

		_embed.addFields(
			// Inventory stats
			{ name: "\u200b", value: `\n\`\`\`ansi\n${stats_f_1.join("\n")}\`\`\``, inline: true },
			// Profile stats
			{ name: "\u200b", value: `\`\`\`ansi\n${stats_profile}\`\`\``, inline: true },
			// Inventory stats
			{ name: "\u200b", value: `\n\`\`\`ansi\n${stats_f_2.join("\n")}\`\`\``, inline: true }
		);

		// Add cards
		_embed.addFields(cards_f[i].map(c_f => ({ name: "\u200b", value: c_f, inline: true })));

		embeds_inventory.push(_embed);
	}

	return embeds_inventory;
}

/** @param {GuildMember|User} user @param {UserData} userData */
function cooldowns(user, userData) {
	// Get the enabled cooldowns from config_player
	let cooldown_types = Object.entries(config_player.cooldowns)
		.filter(([type, time]) => time)
		.map(([type, time]) => type);

	// prettier-ignore
	// Get the user's cooldown timestamps from their UserData
	let cooldowns = cooldown_types.map(type => ({
		type, timestamp: userData.cooldowns.find(c => c.type === type.toLowerCase())?.timestamp || 0
	}));

	// Format the user's cooldowns into list entries
	let cooldowns_f = cooldowns.map(cd => {
		let _eta = jt.eta(cd.timestamp, { nullIfPast: true });

		return "`$AVAILABILITY` **$TYPE** $TIME"
			.replace("$AVAILABILITY", _eta ? "❌" : "✔️")
			.replace("$TYPE", jt.toTitleCase(cd.type.replace(/_/g, " ")))
			.replace("$TIME", _eta ? time(jt.msToSec(cd.timestamp), TimestampStyles.RelativeTime) : "`[Available]`");
	});

	// Create the embed : { COOLDOWNS }
	let embed_cooldowns = new BetterEmbed({
		author: { text: "$USERNAME | cooldowns", user, iconURL: true },
		description: cooldowns_f.join("\n")
	});

	return embed_cooldowns;
}

/** @param {GuildMember|User} user @param {UserData} userData */
function reminders(user, userData) {
	// Get the cooldown names from the player config
	let cooldowns = Object.keys(config_player.cooldowns);

	// Filter out null cooldowns
	cooldowns = cooldowns.filter(cd => (config.player.cooldowns[cd] ? true : false));

	// Parse the cooldowns into strings
	let cooldowns_f = cooldowns.map(cd => {
		let reminder = userData.reminders.find(r => r.type === cd.toLowerCase()) || {};
		let enabled = reminder?.enabled || false;

		let notificationMode = "";

		// prettier-ignore
		switch (reminder.mode) {
			case "channel": notificationMode = "💬"; break;
			case "dm": notificationMode = "📫"; break;
			
			default: jt.parseTime(config.player.cooldowns[cd]) > jt.parseTime(config.player.COOLDOWN_LONG_THRESHOLD)
				? notificationMode = "📫"
				: notificationMode = "💬";
		}

		// return "`$TOGGLE` `$NOTIFICATION_TYPE` **$COOLDOWN**"
		return "$TOGGLE $NOTIFICATION_TYPE $COOLDOWN"
			.replace("$TOGGLE", enabled ? "✔️ enabled " : "❌ disabled")
			.replace("$NOTIFICATION_TYPE", notificationMode)
			.replace("$COOLDOWN", jt.toTitleCase(cd.replace(/_/g, " ")));
	});

	// Create the embed :: { REMINDERS }
	let embed_reminders = new BetterEmbed({
		author: { text: "$USERNAME | reminder", user, iconURL: true },
		description: `\`\`\`${cooldowns_f.join("\n")}\`\`\``
	});

	return embed_reminders;
}

/** @param {GuildMember|User} user @param {UserQuestCache} userQuestCache  @param {UserQuestProgress} userQuestProgress */
function quest(user, userQuestCache, userQuestProgress) {
	let embeds = [];

	// Iterate through each available quest
	for (let i = 0; i < questManager.quests_active.length; i++) {
		let _quest = questManager.quests_active[i];
		let _progress = userQuestProgress ? userQuestProgress.find(p => p.quest_id === _quest.id) : null;

		/* - - - - - { Variables } - - - - - */
		let isComplete = _progress?.quest_complete || userQuestCache.completed.find(c => c === _quest.id) ? true : false;

		// Create the embed :: { QUEST }
		let embed_quest = new BetterEmbed({
			author: { text: "$USERNAME | quest", user, iconURL: true },
			footer: `Page ${i + 1}/${questManager.quests_active.length}`
		});

		/* - - - - - { Format Quest Data } - - - - - */
		let _objectiveTypes = Object.keys(_quest.objectives);

		// prettier-ignore
		// Field description
		let _fieldDescription = [
			markdown.ansi(
				"🏆 Rewards: $OVERVIEW\n$COMPLETE :: 📈 $OBJECTIVE_PROGRESS objectives"
					.replace("$OVERVIEW", questManager.toString.rewards(_quest.rewards))

					.replace("$COMPLETE", isComplete ? "✔️ complete" : "🚫 incomplete")
					.replace(
						"$OBJECTIVE_PROGRESS",
						`${_progress ? _progress.objectives.filter(o => o.complete).length : _objectiveTypes.length}/${_objectiveTypes.length}`
					),
				{ text_color: "yellow", format: "bold", codeblock: true }
			),

			_objectiveTypes.map(type =>
				questManager.toString.objectiveDetails(_quest, type, _progress ? _progress.objectives.find(p => p.type === type) : null, isComplete)
			).join("\n")
		];

		// Add the fields to the embed
		embed_quest.addFields({
			name: `\`📜\` **${_quest.name}** \`⏰\` *ending in ${jt.eta(_quest.ending)}*`,

			value: _fieldDescription.join("\n"),

			inline: true
		});

		// Add the embed to the array
		embeds.push(embed_quest);
	}

	// Return the embeds
	return embeds;
}

/** @param {GuildMember|User} user @param {Cards[]} cards @param {number} sellTotal */
function sell(user, cards, sellTotal) {
	// Parse the cards into strings
	let cards_f = cards.length > 10 ? null : cards.map(c => cardManager.toString.basic(c));

	// Create the embed :: { SELL }
	let embed_sell = new BetterEmbed({
		author: { text: `$USERNAME | sell`, user, iconURL: true },
		description: cards_f
			? `You sold:\n>>> ${cards_f.join("\n")}`
			: `You sold \`${cards.length}\` ${cards.length === 1 ? "card" : "cards"}`,
		footer: `and got ${config_bot.emojis.currency_1.EMOJI} ${sellTotal}`
	});

	return embed_sell;
}

module.exports = { profile, missing, inventory, cooldowns, reminders, quest, sell };
