const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { EmbedNavigator } = require("../modules/discordTools");
const { error_ES, user_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");

module.exports = {
	options: { icon: "❌", deferReply: false },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("missing")
        .setDescription("See which cards you're missing in a set")
    
        .addStringOption(option => option.setName("setid").setDescription("The ID of the set").setRequired(true))
        .addUserOption(option => option.setName("player").setDescription("View another player's missing cards")),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let target = interaction.options.getUser("player") || interaction.member;
		let setID = interaction.options.getString("setid").toLowerCase();

		/// Get the card set
		let card_set = cardManager.get.setID(setID);
		// prettier-ignore
		if (!card_set.length) return await error_ES.send({
            interaction, description: "You must provide a valid set ID", ephemeral: true
        });

		// Defer the reply
		await interaction.deferReply();

		// Check if the target player started
		// prettier-ignore
		if (!await userManager.exists(target.id)) return await error_ES.send({
			interaction, description: "That user has not started yet"
		});

		// prettier-ignore
		// Check if the user has the cards in the given set using Mongo
		let cards_have = await userManager.inventory.has(target.id, { gids: card_set.map(c => c.globalID) });

		// Create the embeds :: { USER MISSING }
		// let embeds_missing = user_ES.missing(target, target.id === interaction.user.id, card_set, cards_have);
		let embeds_missing = user_ES.missing(interaction.member, target, card_set, cards_have);

		// prettier-ignore
		// Set up page navigation
		let embedNav = new EmbedNavigator({
			interaction, embeds: [embeds_missing],
			pagination: { type: "shortJump", useReactions: true }
        });

		return await embedNav.send();
	}
};
