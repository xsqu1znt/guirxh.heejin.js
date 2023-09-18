const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools/_dsT");
const { error_ES, general_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const _jsT = require("../modules/jsTools/_jsT");

module.exports = {
	options: { icon: "👀", deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("view")
        .setDescription("View information about a card")

		.addStringOption(option => option.setName("uid").setDescription("UID of a card you own"))
		.addStringOption(option => option.setName("gid").setDescription("GID of any card"))
        .addStringOption(option => option.setName("setid").setDescription("Set ID to view all cards in a set"))

		.addStringOption(option => option.setName("section").setDescription("More sections to view")
			.addChoices(
				{ name: "⭐ favorite", value: "favorite" },
				{ name: "🏃 idol", value: "idol" },
				{ name: "🔒 vault", value: "vault" },
				{ name: "👯 team", value: "team" }
			)
		),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		/// Interaction options
		let uid = interaction.options.getString("uid");
		let globalID = interaction.options.getString("gid");
		let setID = interaction.options.getString("setid");
		let section = interaction.options.getString("section");

		// Send the appropriate view based on what option the user provided
		if (uid) {
			// Fetch the card from the user's card_inventory
			let card = await userManager.inventory.get(interaction.user.id, { uids: uid });
			if (!card) return await error_ES.send({ description: "You need to give a valid UID" });

			// Create the view embed
			let embed_view = general_ES.view(interaction.member, card, "uid");
		}
	}
};
