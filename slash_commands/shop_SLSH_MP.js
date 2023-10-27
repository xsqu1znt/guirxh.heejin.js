const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed, EmbedNavigator } = require("../modules/discordTools/_dsT");
const { error_ES, general_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const itemManager = require("../modules/itemManager");
const _jsT = require("../modules/jsTools/_jsT");

const config = { bot: require("../configs/config_bot.json") };

module.exports = {
	options: { icon: "🛍️", deferReply: false },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("shop")
        .setDescription("View the shop")

        .addStringOption(option => option.setName("buy").setDescription("Buy items using their ID")),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let itemID = interaction.options.getString("buy");

		// Display the shop if an item ID wasn't provided
		if (!itemID) {
			let userData = await userManager.fetch(interaction.user.id, { type: "balance" });

			// Create the embed :: { SHOP }
			let embeds_shop = general_ES.shop(interaction.member, userData);

			// prettier-ignore
			// Set up embed navigation
			let embedNav = new EmbedNavigator({
                interaction, embeds: embeds_shop.embeds, selectMenuEnabled: true,
				pagination: { type: "shortJump", dynamic: false, useReactions: false }
            });

			// Add select menu options
			embedNav.addSelectMenuOptions(...embeds_shop.navigationData);

			// Send the embed with navigation
			return await embedNav.send();
		}

		/* - - - - - { Buy an Item } - - - - - */
		let item = await itemManager.buyItem();

		// prettier-ignore
		// Purchase failed due to not having enoug balance
		if (!item.item && item.type) return error_ES.send({
			interaction, author: { text: "⛔ Purchase failed" },
			description: "You do not have enough to buy this item"
		});

		switch (item.type) {
			// prettier-ignore
			case "card": return;

			// prettier-ignore
			default: return error_ES.send({
				interaction, author: { text: "⛔ Purchase failed" },
				description: `\`${itemID}\` is not an item in the shop`
			});
		}
	}
};
