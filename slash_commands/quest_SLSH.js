const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { error_ES, user_ES } = require("../modules/embedStyles/index");
const { userManager, questManager } = require("../modules/mongo/index");
// const _jsT = require("../modules/jsTools/_jsT");

module.exports = {
	options: { icon: "📜", deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("quest")
        .setDescription("View quests"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		// prettier-ignore
		// Check if there's any quests currently
		if (!questManager.quests.length) return await error_ES.send({
            interaction, description: "There are no quests right now"
        });

		// Fetch the user from Mongo
		let userData = await userManager.fetch(interaction.user.id, { type: "quest" });

		// Create the embed :: { QUEST }
		let embed_quest = user_ES.quest(interaction.member, userData);

		// Send the embed
		return await embed_quest.send({ interaction });
	}
};
