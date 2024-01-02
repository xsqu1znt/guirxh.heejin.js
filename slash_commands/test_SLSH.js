const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed, markdown } = require("../modules/discordTools");
const { userManager, questManager } = require("../modules/mongo/index");
const jt = require("../modules/jsTools");

module.exports = {
	options: { deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("test")
        .setDescription("A test command for dev stuff"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let debugTime = Date.now();

		let card = await userManager.inventory.get(interaction.user.id, { uid: "hpr537" });
		let cards = await userManager.inventory.getMultiple(interaction.user.id, { uids: ["hpr537", "203d1g"] });

		console.log(card);
		console.log(cards);

		return await interaction.editReply({
			content: `completed in ${jt.eta(Date.now(), { since: debugTime })}`
		});
	}
};
