const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { EmbedNavigator, BetterEmbed } = require("../modules/discordTools/_dsT");
const { error_ES, user_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");

module.exports = {
	options: { icon: "❌", deferReply: false },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("missing")
        .setDescription("See which cards you're missing in a set")
    
        .addStringOption(option => option.setName("setid").setDescription("The ID of the set")
            .setRequired(true)
        ),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let setID = interaction.options.getString("setid").toLowerCase();

		/// Get the card set
        let card_set = cardManager.get.setID(setID);
        // prettier-ignore
        if (!card_set.length) return await error_ES.send({
            interaction, description: "You must provide a valid set ID", ephemeral: true
        });

		// Defer the reply
		await interaction.deferReply();

		// Fetch the user from Mongo
		let userData = await userManager.fetch(interaction.user.id, { type: "inventory" });

		// Create the embeds :: { USER MISSING }
		let embeds_missing = user_ES.missing(interaction.member, userData, card_set);

		// prettier-ignore
		// Set up page navigation
		let embedNav = new EmbedNavigator({
			interaction, embeds: [embeds_missing],
			pagination: { type: "shortJump", useReactions: true }
        });

		return await embedNav.send();
	}
};
