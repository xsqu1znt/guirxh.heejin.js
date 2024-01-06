// prettier-ignore
const { Client, CommandInteraction, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools");
const { userManager } = require("../modules/mongo/index");
const { error_ES } = require("../modules/embedStyles");

const config = {
	bot: require("../configs/config_bot.json"),
	player: require("../configs/config_player.json")
};

module.exports = {
	options: { icon: "🏎️", deferReply: false, dontRequireUserData: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("start")
		.setDescription("Start your journey"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		// prettier-ignore
		// Check if the user already started the bot
		if (await userManager.exists(interaction.user.id)) return await error_ES.send({
			interaction, description: "You already started, silly!", ephemeral: true
		});

		// Defer the reply
		await interaction.deferReply();
		// Add the user to the Mongo database
		await userManager.insert(interaction.user.id);

		// Create a button :: { JOIN SERVER }
		let btn_joinServer = new ButtonBuilder()
			.setStyle(ButtonStyle.Link)
			.setURL(config.bot.community_server.INVITE_URL)
			.setLabel("Join our Server!");

		// Create an action row :: { JOIN SERVER }
		let aR_joinServer = new ActionRowBuilder().setComponents(btn_joinServer);

		// Create the embed :: { START }
		let embed_start = new BetterEmbed({
			interaction,
			author: { text: "Welcome, $USERNAME!", iconURL: true },
			thumbnailURL: "https://cdn.discordapp.com/emojis/1112095628684697720.webp?size=128&quality=lossless",
			description: `Welcome to **Heejin 3.0**\nThank you for showing interest in playing our bot \`❤️\`\n\n> \`01.\` You can start your journey by using any of our **\`/drop\`** commands. \n> \`02.\` You can view **\`/inventory\`** to see all cards you own and **\`/profile\`** to view all your basic information.\n> \`03.\` There are a bunch of commands out there waiting for you to use.\n> Example: Use **\`/set\`** to add all your faves to all these places: \n> **\`🔒 vault\`** **\`👯 team\`** **\`🏃 idol\`** **\`⭐ favorite\`**\n\n*There's so much more waiting for you!*\nHope you enjoy playing!\n\n> **You got**: \`${config.bot.emojis.currency_1.EMOJI} ${config.player.currency.STARTING_BALANCE}\``
		});

		// Send the embed
		return await embed_start.send({ components: aR_joinServer });
	}
};
