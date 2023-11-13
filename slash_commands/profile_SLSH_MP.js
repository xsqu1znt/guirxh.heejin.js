const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { EmbedNavigator, BetterEmbed } = require("../modules/discordTools");
const { error_ES, user_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const _jsT = require("../modules/jsTools");

module.exports = {
	options: { icon: "📈", deferReply: false },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("profile")
        .setDescription("View your profile")
    
        .addUserOption(option => option.setName("player").setDescription("View another player's profile"))
        .addStringOption(option => option.setName("bio").setDescription("Set your biography, use \"clear\" to remove")),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let target = interaction.options.getUser("player") || interaction.member;
		let biography = interaction.options.getString("bio");

		/* - - - - - { Set the User's Biography } - - - - - */
		if (biography) {
			// prettier-ignore
			// Character limit
			if (biography.length > 256) return await error_ES.send({
				interaction, description: "Your biography cannot be longer than 256 characters",
				ephemeral: true
			});

			let reset = biography.toLowerCase() === "clear" ? true : false;

			// Update the user's biography in Mongo
			await userManager.update(interaction.user.id, { biography: reset ? "" : biography });

			// prettier-ignore
			// Create the embed :: { BIOGRAPHY }
			let embed_biography = new BetterEmbed({
				interaction, author: "✏️ Biography",
				description: reset
					? "You cleared your **\`👤 biography\`**"
					: `You set your **\`👤 biography\`**:\n> ${biography}`
			});

			return await embed_biography.send({ ephemeral: true });
		}

		/* - - - - - { Show the User's Profile } - - - - - */
		// prettier-ignore
		// Check if the target user started the bot
		if (!(await userManager.exists(interaction.user.id))) return await error_ES.send({
			description: "That user has not started yet", ephemeral: true
		});

		// Defer the reply
		await interaction.deferReply();

		/// Fetch user data from Mongo
		let userData = await userManager.fetch(interaction.user.id, { type: "essential" });
		let inventoryStats = await userManager.inventory.stats(interaction.user.id);
		let [card_selected, card_favorite] = await userManager.inventory.get(interaction.user.id, {
			uids: [userData.card_selected_uid, userData.card_favorite_uid]
		});

		// Create the embed :: { PROFILE }
		let embeds_profile = user_ES.profile(target, { userData, card_selected, card_favorite, inventoryStats });

		// Set up embed navigation
		let embedNav = new EmbedNavigator({ interaction, embeds: embeds_profile.embeds, selectMenuEnabled: true });

		// Add select menu options
		embedNav.addSelectMenuOptions(...embeds_profile.navigationData);

		// Send the embed with navigation
		return await embedNav.send();
	}
};
