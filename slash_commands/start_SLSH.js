const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools/_dsT");
const { userManager } = require("../modules/mongo/index");

const config_bot = require("../configs/config_bot.json");
const config_player = require("../configs/config_player.json");

module.exports = {
	options: { icon: "🏎️", deferReply: false, dontRequireUserData: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("start")
		.setDescription("Start your journey"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		// prettier-ignore
		// Create the start embed
		let embed_start = new BetterEmbed({
			interaction, author: { text: "$USERNAME | start", user: interaction.member }
		});

		// Check if the user already started the bot
		if (await userManager.exists(interaction.user.id))
			return await embed_start.send({ description: "You already started", ephemeral: true });

		// Defer the reply
		await interaction.deferReply();

		// Add the user to the Mongo database
		await userManager.insertNew(interaction.user.id);

		// Send the embed
		return await embed_start.send({
			author: { text: "Welcome, $USERNAME!" },
			description: `Welcome to **Heejin 2.0**\nThank you for showing interest in playing our bot \`❤️\`\n\n> \`01.\` You can start your journey by using any of our \`/drop\` commands. \n> \`02.\` You can view \`/inventory\` to see all cards you own and \`/profile\` to view all your basic information.\n> \`03.\` There is a bunch of commands out there waiting for you to use.\n> Example: Use \`/set\` to add all your faves to all these places: \n> \`🔒 vault\` \`👯 team\` \`🏃 idol\` \`⭐ favorite\`\n\n*There's so much more waiting for you!*\nHope you enjoy playing! You can join our server by [**clicking here**](${config_bot.community_server.INVITE_URL})\n\n> **You got**: \`${config_bot.emojis.currency_1.EMOJI} ${config_player.currency.STARTING_BALANCE}\``
		});
	}
};
