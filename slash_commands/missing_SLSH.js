const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { EmbedNavigator } = require("../modules/discordTools/_dsT");
const { user_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");

module.exports = {
	options: { icon: "❌", deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("missing")
        .setDescription("See which cards you're missing in a set")
    
        .addStringOption(option => option.setName("setid").setDescription("The ID of the set")
            .setRequired(true)
        ),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let setID = interaction.options.getString("setid");

		// Fetch the user from Mongo
		let userData = await userManager.fetch(interaction.user.id, { type: "inventory" });

		let embeds_missing = user_ES.missing(interaction.member, userData, setID);

		// prettier-ignore
		// Set up page navigation
		let embedNav = new EmbedNavigator({
			interaction, embeds: [embeds_missing],
			pagination: { type: "shortJump", useReactions: true }
        });

		return await embedNav.send();
	}
};
