const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { EmbedNavigator } = require("../../modules/discordTools");
const { general_ES } = require("../../modules/embedStyles/index");

module.exports = {
	options: { icon: "📁", deferReply: false, dontRequireUserData: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("collections")
        .setDescription("View a list of every set in the game")
    
        .addStringOption(option => option.setName("rarity").setDescription("Filter by RARITY"))
        .addStringOption(option => option.setName("setid").setDescription("Filter by SETID"))
        .addStringOption(option => option.setName("category").setDescription("Filter by CATEGORY"))
        .addStringOption(option => option.setName("group").setDescription("Filter by GROUP"))
        .addStringOption(option => option.setName("order").setDescription("Default: Ascending")
			.addChoices({ name: "Ascending", value: "ascending" }, { name: "Descending", value: "descending" })
		),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		// Sorting options
		let options_collections = {
			rarity: interaction.options.getString("rarity") || "",
			setID: interaction.options.getString("setid") || "",
			category: interaction.options.getString("category") || "",
			group: interaction.options.getString("group") || "",
			order: interaction.options.getString("order") || "ascending"
		};

		// Create the embeds :: { GENERAL COLLECTION }
		let embeds_collections = general_ES.collections(interaction.member, options_collections);

		// prettier-ignore
		// Set up page navigation
		let embedNav = new EmbedNavigator({
			interaction, embeds: [embeds_collections],
			pagination: { type: "longJump", dynamic: false, useReactions: true }
        });

		return await embedNav.send();
	}
};
