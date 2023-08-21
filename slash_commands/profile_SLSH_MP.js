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
		let user = interaction.options.getUser("player") || interaction.member;
		let biography = interaction.options.getString("bio");

		// Check if a biography was provided
		if (biography) {
			// prettier-ignore
			let embed_biography = new BetterEmbed({
                interaction, author: { text: "$USERNAME | biography", user: interaction.member },
                description: biography.toLowerCase() === "reset"
                    ? "Your bio has been reset"
                    : `Your bio has been set to:\n> ${biography}`
			});

			return await Promise.all([
				// Update the user's biography in Mongo
				userManager.update(interaction.user.id, { biography: biography.toLowerCase() === "reset" ? "" : biography }),
				// Send the embed
				embed_biography.send()
			]);
		}

		// Fetch the user from Mongo
		let userData = await userManager.fetch(user.id, { type: "noInventory" });
		if (!userData) return await error_ES.send({ description: "That user has not started yet", ephemeral: true });

		/// Create the embed :: { PROFILE }
		// prettier-ignore
		/* let [card_selected, card_favorite] = await userManager.inventory.get(interaction.user.id,
			[userData.card_selected_uid, userData.card_favorite_uid]
		); */

		let embeds_profile = await user_ES.profile(user, userData);

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

		return await embedNav.send();
	}
};
