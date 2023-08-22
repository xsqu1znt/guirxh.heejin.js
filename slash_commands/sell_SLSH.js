const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed, awaitConfirmation, deleteMessageAfter } = require("../modules/discordTools/_dsT");
const { error_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");

const config_bot = require("../configs/config_bot.json");
const _jsT = require("../modules/jsTools/_jsT");

module.exports = {
	options: { icon: "💰", deferReply: false },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("sell")
        .setDescription("Sell cards in your inventory")
    
        .addStringOption(option => option.setName("uid").setDescription("Use UID separate by comma"))
		.addStringOption(option => option.setName("setid").setDescription("Use SETID separate by comma")),
	// .addStringOption(option => option.setName("category").setDescription("Use UID separate by comma")),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		/// Get interaction options
		let uids = interaction.options.getString("uid");
		uids &&= _jsT.isArray(uids.toLowerCase().replace(/ /g, "").split(","));
		uids ||= [];

		let setIDs = interaction.options.getString("setid");
		setIDs &&= _jsT.isArray(setIDs.toLowerCase().replace(/ /g, "").split(","));
		setIDs ||= [];

		/* let categories = interaction.options.getString("category");
		categories &&= _jsT.isArray(categories.toLowerCase().replace(/ /g, "").split(","));
		categories ||= []; */

		// prettier-ignore
		// Check if the user provided a uid/category
		if (!uids.length && !setIDs.length) return await error_ES.send({
			interaction, description: "You need to give either a UID or set ID", ephemeral: true
		});

		// Check if the categories the user gave exist
		/* if (categories.length) {
			let _categories_invalid = categories.filter(cat => !cardManager.category_names_all.includes(cat));

			// prettier-ignore
			if (_categories_invalid.length) return await error_ES.send({
				interaction, ephemeral: true,
				description: _categories_invalid.length === 1
					? `\`${_categories_invalid[0]}\` is not a valid category`
					: `\`${_categories_invalid.join(", ")}\` are not valid categories`
			});
		} */

		// Defer the interaction reply
		await interaction.deferReply();

		// Fetch the user from Mongo
		let userData = await userManager.fetch(interaction.user.id, { type: "essential" });

		/// Create an array of cards chosen by the user
		let cards = [];

		if (uids.length) {
			// prettier-ignore
			let _cards = _jsT
				.isArray(await userManager.inventory.get(interaction.user.id, { uids }))
				.filter(c => c).map(c => cardManager.parse.fromCardLike(c));

			// prettier-ignore
			// Let the user know no cards were found using those UIDs
			if (!_cards.length) return await error_ES.send({
				interaction, description: `No cards were found with ${uids.length === 1 ? "that UID" : "those UIDs"}`
			});

			// prettier-ignore
			// Filter out locked/favorited/selected/team cards
			_cards = _cards.filter(c =>
            	!c.locked && ![userData.card_favorite_uid, userData.card_selected_uid, ...userData.card_team_uids].includes(c.uid)
			);

			// prettier-ignore
			// Let the user know they tried to sell locked/favorited/selected/team cards
			if (!_cards.length) return await error_ES.send({
				interaction, description: `${uids.length === 1 ? "That card" : "Those cards"} cannot be sold, it is either:\n\`🔒 vault\` \`🧑🏾‍🤝‍🧑 team\` \`🏃 idol\` \`⭐ favorite\``
			});

			cards.push(..._cards);
		}

		if (setIDs.length) {
			let _globalIDs = [];
			for (let id of setIDs) {
				let _card_set = cardManager.get.setID(id);
				if (_card_set.length) _globalIDs.push(..._card_set.map(c => c.globalID));
			}

			// prettier-ignore
			let _cards = _jsT
				.isArray(await userManager.inventory.get(interaction.user.id, { gids: _globalIDs }))
				.filter(c => c).map(c => cardManager.parse.fromCardLike(c));

			// prettier-ignore
			// Let the user know no cards were found using those UIDs
			if (!_cards.length) return await error_ES.send({
				interaction, description: `No cards were found with ${uids.length === 1 ? "that set ID" : "those set IDs"}`
			});

			// prettier-ignore
			// Filter out locked/favorited/selected/team cards
			_cards = _cards.filter(c =>
            	!c.locked && ![userData.card_favorite_uid, userData.card_selected_uid, ...userData.card_team_uids].includes(c.uid)
			);

			// prettier-ignore
			// Let the user know they tried to sell locked/favorited/selected/team cards
			if (!_cards.length) return await error_ES.send({
				interaction, description: `${uids.length === 1 ? "That card" : "Those cards"} cannot be sold, it is either:\n\`🔒 vault\` \`🧑🏾‍🤝‍🧑 team\` \`🏃 idol\` \`⭐ favorite\``
			});

			/// Filter out non-dupes
			let _card_globalIDs = _jsT.unique(_cards.map(c => c.globalID));
			let _card_duplicates = [];

			for (let gid of _card_globalIDs) {
				let _dupes = _cards.filter(c => c.globalID === gid);
				if (_dupes.length > 1) _card_duplicates.push(..._dupes.slice(1));
			}

			_cards = _card_duplicates;

			// prettier-ignore
			// Let the user know they don't have enough duplicates in that set to sell
			if (!_cards.length) return await error_ES.send({
				interaction, description: `You do not have enough duplicates in ${setIDs.length === 1 ? "that set" : "those sets"} to sell`
			});

			cards.push(..._cards);
		}

		/* if (categories.length) {
			let _cards = [];

			// prettier-ignore
			await Promise.all(categories.map(async cat => {
				let _c = await userManager.inventory.get(interaction.user.id, { gids: cardManager.category_gids_all.get(cat) });
				_c = _c.filter(c => c);

				if (_c.length) _cards.push(..._c);
			}));

			// prettier-ignore
			// Let the user know no cards were found in those categories
			if (!_cards.length) return await error_ES.send({
				interaction, description: `No cards were found in ${categories.length === 1 ? "that category" : "those categories"}`
			});

			// prettier-ignore
			// Filter out locked/favorited/selected/team cards
			_cards = _cards.filter(c =>
            	!c.locked && ![userData.card_favorite_uid, userData.card_selected_uid, ...userData.card_team_uids].includes(c.uid)
			);

			// Get only cards that have duplicates
			let _cards_gids = _jsT.unique(_cards.map(c => c.globalID));

			for (let gid of _cards_gids) {
				let _c = _cards.filter(c => c.globalID === gid);
				if (_c.length > 2) _cards.push(..._c.slice(2));
			}

			// prettier-ignore
			// Let the user know they tried to sell locked/favorited/selected/team cards
			if (!_cards.length) return await error_ES.send({
				interaction, description: `${uids.length === 1 ? "That card" : "Those cards"} cannot be sold, it is either:\n\`🔒 vault\` \`🧑🏾‍🤝‍🧑 team\` \`🏃 idol\` \`⭐ favorite\``
			});

			// cards.push(..._cards);

			// TODO: Filter only certain dupes
		} */

		// Parse CardLikes into Cards
		// cards = cards.map(c => cardManager.parse.fromCardLike(c));

		// Create the embed :: { SELL }
		let embed_sell = new BetterEmbed({ interaction, author: { text: "$USERNAME | sell", user: interaction.member } });

		// prettier-ignore
		/* if (!cards.length) return await error_ES.send({
            description: `\`$UIDS\` cannot be sold, it is either:\n\`🔒 vault\` \`🧑🏾‍🤝‍🧑 team\` \`🏃 idol\` \`⭐ favorite\``
                .replace("$UIDS", uids.filter(uid => !cards.map(c => c.uid).includes(uid)).join(", "))
        }); */

		// Format the cards into strings if there's less than 10
		let cards_f = cards.length <= 10 ? cards.map(c => cardManager.toString.basic(c)) : "";

		// Calculate how many carrots the user will get
		let sell_total = _jsT.sum(cards.map(c => c.sellPrice));

		// prettier-ignore
		// Wait for the user to confirm
		let confirmation_sell = await awaitConfirmation({
			interaction, showAuthorIcon: true, deleteOnConfirmation: false,
			description: cards_f
				? `**Are you sure you want to sell:**\n>>> ${cards_f.join("\n")}`
				: `**Are you sure you want to sell \`${cards.length}\` ${cards.length === 1 ? "card" : "cards"}?**`,
			footer: `you will get ${config_bot.emojis.currency_1.EMOJI} ${sell_total}`
        });

		if (confirmation_sell) {
			// prettier-ignore
			if (!await userManager.inventory.sell(interaction.user.id, cards)) return await error_ES.send({
                interaction, description: "Cannot sell cards that are not in your inventory", sendMethod: "channel", ephemeral: true
            });

			return await embed_sell.send({
				description: cards_f
					? `You sold:\n>>> ${cards_f.join("\n")}`
					: `You sold \`${cards.length}\` ${cards.length === 1 ? "card" : "cards"}`,
				footer: `and got ${config_bot.emojis.currency_1.EMOJI} ${sell_total}`
			});
		} else {
			return await deleteMessageAfter(
				await embed_sell.send({
					author: {},
					components: [],
					description: `> You cancelled selling \`${cards.length}\` ${cards.length === 1 ? "card" : "cards"}`
				})
			);
		}
	}
};
