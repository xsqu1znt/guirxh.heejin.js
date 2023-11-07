const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { EmbedNavigator, BetterEmbed } = require("../modules/discordTools/_dsT");
const { error_ES, user_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const _jsT = require("../modules/jsTools/_jsT");

module.exports = {
	options: { icon: "📈", deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("profile")
        .setDescription("View your profile")
    
        .addUserOption(option => option.setName("player").setDescription("View another player's profile"))
        .addStringOption(option => option.setName("bio").setDescription("Change your bio | use \"reset\" to remove")),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let target = interaction.options.getUser("player") || interaction.member;
		let biography = interaction.options.getString("bio");

		// Set the user's biography
		if (biography) {
			// Update the user's biography in Mongo
			userManager.update(interaction.user.id, { biography: biography.toLowerCase() === "reset" ? "" : biography });

			// prettier-ignore
			// Create the embed and send it :: { BIOGRAPHY }
			return await new BetterEmbed({
				interaction, author: { text: "$USERNAME | biography", iconURL: true },
				description: biography.toLowerCase() === "reset"
					? "Your bio has been reset"
					: `Your bio has been set to:\n> ${biography}`
			}).send({ ephemeral: true });
		}

		// prettier-ignore
		// Check if the target user started the bot
		if (!(await userManager.exists(interaction.user.id))) return await error_ES.send({
			description: "That user has not started yet", ephemeral: true
		});

		// Fetch the user from Mongo
		let userData = await userManager.fetch(interaction.user.id, { type: "essential" });

		// Create the embed :: { PROFILE }
		let embeds_profile = user_ES.profile(target, { userData });

		return await embeds_profile.send();

		/* 
		// prettier-ignore
		// Create embed navigation
		let embedNav = new EmbedNavigator({
			interaction, embeds: Object.values(embeds_profile).filter(e => e),
			selectMenuEnabled: true
		});

		/// Add select menu options
		embedNav.addSelectMenuOptions({ label: "📄 Basic Information", description: "View your basic information" });

		// prettier-ignore
		if (embeds_profile.badges) embedNav.addSelectMenuOptions({ label: "📛 User Badges", description: "View your badges" });
		// prettier-ignore
		if (embeds_profile.favorited) embedNav.addSelectMenuOptions({ label: "⭐ Favorite Card", description: "View your favorite" });
		// prettier-ignore
		if (embeds_profile.selected) embedNav.addSelectMenuOptions({ label: "🏃 Stage Idol", description: "View your stage idol" });

		embedNav.addSelectMenuOptions({ label: "🃏 Detailed Collection", description: "View your detailed collection" });

		return await embedNav.send(); */
	}
};
