const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed, EmbedNavigator } = require("../../modules/discordTools");
const { userManager, questManager } = require("../../modules/mongo/index");
const { error_ES, user_ES } = require("../../modules/embedStyles/index");
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

		// Make sure the user has quest cache saved
		await userManager.quests.insertNew(interaction.user.id);

		// Fetch the user's quest cache from Mongo
		let userQuestCache = await userManager.quests.fetch(interaction.user.id);

		// Get the user's quest progress
		let userQuestProgress = await questManager.updateQuestProgress(interaction.user);

		// Create the embeds:: { QUEST }
		let embeds_quest = user_ES.quest(interaction.member, userQuestCache, userQuestProgress.progress);

		// prettier-ignore
		// Set up page navigation
		let embedNav = new EmbedNavigator({
			interaction, embeds: [embeds_quest],
			pagination: { type: "short", useReactions: true }
        });

		return await embedNav.send();
	}
};
