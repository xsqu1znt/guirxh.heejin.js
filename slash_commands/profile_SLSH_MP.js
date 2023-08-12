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
		let userData = await userManager.fetch(user.id, { type: "essential" });
		if (!userData) return await error_ES.send({ description: "That user has not started yet", ephemeral: true });

		/// Create the embed :: { PROFILE }
		// prettier-ignore
		let cards_user = [selected, favorite] = await userManager.inventory.get(interaction.user.id, [
			userData.card_selected_uid, userData.card_favorite_uid
		]);

		// prettier-ignore
		let inventory = {
			selected: cards_user[0], favorite: cards_user[1],
			count: await userManager.inventory.count(interaction.user.id, true)
		};

		let embed_profile = user_ES.profile(user, userData, inventory);

		return await embed_profile.send();
	}
};
