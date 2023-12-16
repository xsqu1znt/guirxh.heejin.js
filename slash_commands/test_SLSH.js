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

		let userQuestData = await Promise.all(
			questManager.quests_active.map(q => questManager.checkUserQuest(userID, q.id))
		);

		console.log(userQuestData);

		return await interaction.editReply({
			content: `completed \`${jt.eta({ now: debugTime, then: Date.now() })}\``
		});
	}
};
