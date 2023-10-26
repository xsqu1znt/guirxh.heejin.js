const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed, EmbedNavigator } = require("../modules/discordTools/_dsT");
const { error_ES, general_ES } = require("../modules/embedStyles/index");
const _jsT = require("../modules/jsTools/_jsT");

const config = { bot: require("../configs/config_bot.json") };

module.exports = {
	options: { icon: "🛍️", deferReply: false },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("shop")
        .setDescription("View the shop")

        .addStringOption(option => option.setName("buy").setDescription("Buy an item using the ID")),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let itemID = interaction.options.getString("buy");

		// Display the shop if an item ID wasn't provided
		if (!itemID) {
			// Create the embed :: { SHOP }
			let embeds_shop = general_ES.shop(interaction.member);

			// prettier-ignore
			// Set up embed navigation
			let embedNav = new EmbedNavigator({
                interaction, embeds: embeds_shop.embeds, selectMenuEnabled: true,
				pagination: { type: "shortJump", dynamic: false, useReactions: false }
            });

			// Add select menu options
			embedNav.addSelectMenuOptions(embeds_shop.navigationData);

			// Send the embed with navigation
			return await embedNav.send();
		}
	}
};
