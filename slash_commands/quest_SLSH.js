const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { error_ES, user_ES } = require("../modules/embedStyles/index");
const { userManager, questManager } = require("../modules/mongo/index");
const { BetterEmbed } = require("../modules/discordTools");
// const jt = require("../modules/jsTools");

module.exports = {
	options: { icon: "📜", deferReply: false },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("quest")
        .setDescription("View quests"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		// Check if there's any active quests currently
		if (!questManager.quests_active.length) {
			// prettier-ignore
			// Create the embed :: { NO QUESTS }
			let embed_noQuests = new BetterEmbed({
				interaction, author: "📜 Quest",
				description: "There are no quests right now"
			});

			return await embed_noQuests.send({ ephemeral: true });
		}

		await interaction.deferReply();

		// Fetch the user from Mongo
		let userData = await userManager.fetch(interaction.user.id, { type: "quest" });

		// Create the embed :: { QUEST }
		let embed_quest = user_ES.quest(interaction.member, userData);

		// Send the embed
		return await embed_quest.send({ interaction });
	}
};
