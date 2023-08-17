const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools/_dsT");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");

module.exports = {
	options: { deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("test")
        .setDescription("A test command for dev stuff"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		/* let cards = [];
		for (let i = 0; i < 10; i++) cards.push(...cardManager.get.setID("105"));

		await userManager.inventory.add(interaction.user.id, cards);

		let embed_beep = new BetterEmbed({ interaction, description: `You have been given \`${cards.length}\` cards` });

		return await embed_beep.send(); */

		await userManager.inventory.stats(interaction.user.id);

		// prettier-ignore
		let embed = new BetterEmbed({
			interaction, /* author: { text: "$USERNAME | inventory", user: interaction.member }, */
			description: "boop"
		});

		return await embed.send();
	}
};
