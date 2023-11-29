const {
	Client,
	CommandInteraction,
	SlashCommandBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	ActionRowBuilder
} = require("discord.js");

const { BetterEmbed, markdown } = require("../modules/discordTools");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");

module.exports = {
	options: { deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("test")
        .setDescription("A test command for dev stuff"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let cards = cardManager.get.random({ type: "general", count: 5 });

		// prettier-ignore
		// Create the embed :: { SELL MOCKUP }
		let embed = new BetterEmbed({
			interaction, author: "🥕 Sell",
			description: "Choose which cards you want to sell"
		});

		// Create the select menu
		let selectMenu_options = cards.map((c, idx) =>
			new StringSelectMenuOptionBuilder()
				.setValue(`card_${idx}`)
				// .setEmoji("🃏")
				.setLabel(`${c.emoji} ${c.single} [${c.group}] ${c.name}`)
				.setDescription(`UID: ${c.uid} :: GID: ${c.globalID} :: 🗣️ ${c.setID}`)
		);

		let selectMenu = new StringSelectMenuBuilder()
			.setCustomId("test")
			.setPlaceholder("Select what you want to sell")
			.addOptions(...selectMenu_options)
			.setMaxValues(cards.length);

		let actionRow = new ActionRowBuilder().addComponents(selectMenu);

		// Send the embed with components
		return await embed.send({ components: actionRow });
	}
};
