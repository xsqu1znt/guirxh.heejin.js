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
		.addStringOption(option => option.setName("category").setDescription("Use UID separate by comma")),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		/// Get interaction options
		let uids = interaction.options.getString("uid");
		uids &&= _jsT.isArray(uids.toLowerCase().replace(/ /g, "").split(","));
		let categories = interaction.options.getString("category");
		categories &&= _jsT.isArray(categories.toLowerCase().replace(/ /g, "").split(","));

		// prettier-ignore
		// Check if the user provided a uid/category
		if (!uids.length && !categories.length) return await error_ES.send({
			interaction, description: "You need to give either a uid or category", ephemeral: true
		});

		// Defer the interaction reply
		await interaction.deferReply();

		// Fetch the user from Mongo
		let userData = await userManager.fetch(interaction.user.id, { type: "essential" });

		/// Create an array of cards chosen by the user
		let cards = [];

		if (uids.length) {
			// prettier-ignore
			let _cards = _jsT
				.isArray(await userManager.inventory.get(interaction.user.id, uids))
				.filter(c => c).map(c => cardManager.parse.fromCardLike(c));

			// prettier-ignore
			// Let the user know no cards were found using those UIDs
			if (!_cards.length) return await error_ES.send({
				interaction, description: `No cards were found with ${uids.length === 1 ? "that UID" : "those UIDs"}`
			});

			// prettier-ignore
			// Filter out locked/favorited/selected/team cards
			_cards = cards.filter(c =>
            	!c.locked && ![userData.card_favorite_uid, userData.card_selected_uid, ...userData.card_team_uids].includes(c.uid)
			);

			// prettier-ignore
			// Let the user know they tried to sell locked/favorited/selected/team cards
			if (!_cards.length) return await error_ES.send({
				interaction, description: `${uids.length === 1 ? "That card" : "Those cards"} cannot be sold, it is either:\n\`🔒 vault\` \`🧑🏾‍🤝‍🧑 team\` \`🏃 idol\` \`⭐ favorite\``
			});

			cards.push(..._cards);
		}

		if (categories.length) {
			let _cards = _jsT
				.isArray(await userManager.inventory.get())
		}

		// Create the embed :: { SELL }
		let embed_sell = new BetterEmbed({ interaction, author: { text: "$USERNAME | sell", user: interaction.member } });

		/// Fetch the cards from the user's card_inventory
		// prettier-ignore
		// let cards = _jsT
		// .isArray(await userManager.inventory.get(interaction.user.id, uids))
		// .filter(c => c).map(c => cardManager.parse.fromCardLike(c));

		if (!cards.length) return await error_ES.send({ interaction, description: "You need to give a valid card UID" });

		// prettier-ignore
		cards = cards.filter(c =>
            !c.locked && ![userData.card_favorite_uid, userData.card_selected_uid, ...userData.card_team_uids].includes(c.uid)
        );

		// prettier-ignore
		if (!cards.length) return await error_ES.send({
            description: `\`$UIDS\` cannot be sold, it is either:\n\`🔒 vault\` \`🧑🏾‍🤝‍🧑 team\` \`🏃 idol\` \`⭐ favorite\``
                .replace("$UIDS", uids.filter(uid => !cards.map(c => c.uid).includes(uid)).join(", "))
        });

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
			footer: `you will get ${config_bot.emojis.CURRENCY_1.EMOJI} ${sell_total}`
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
				footer: `you got ${config_bot.emojis.CURRENCY_1.EMOJI} ${sell_total}`
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
