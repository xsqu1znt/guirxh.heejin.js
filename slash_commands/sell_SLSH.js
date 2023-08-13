const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed, awaitConfirmation } = require("../modules/discordTools/_dsT");
const { error_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");

const config_bot = require("../configs/config_bot.json");
const _jsT = require("../modules/jsTools/_jsT");

module.exports = {
	options: { icon: "💰", deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("cookie")
        .setDescription("Get a cookie, or a glass of milk")
    
        .addStringOption(option => option.setName("uid").setDescription("Use UID separate by comma")
            .setRequired(true)
        ),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let uids = interaction.options.getString("uid").replace(/ /g, "").split(",");
		if (!Array.isArray(uids)) uids = [uids];

		// Create the embed :: { SELL }
		let embed_sell = new BetterEmbed({ interaction, author: { text: "$USERNAME | sell", user: interaction.member } });

		// Fetch the user from Mongo
		let userData = await userManager.fetch(interaction.user.id, { type: "essential" });

		/// Fetch the cards from the user's card_inventory
		let cards = (await userManager.inventory.get(interaction.user.id, uids)).map(c => cardManager.parse.fromCardLike(c));
		if (!cards.length) return await error_ES.send({ description: "You need to give a valid card UID" });

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
		let sell_total = _jsT.sum(cards, "sellPrice");

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

			// prettier-ignore
			return await embed_sell.send({ description: cards_f
				? `You sold:\n>>> ${cards_f.join("\n")}`
				: `You sold \`${cards.length}\` ${cards.length === 1 ? "card" : "cards"}`
			});
		}
	}
};
