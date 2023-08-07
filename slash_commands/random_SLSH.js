const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools/_dsT");
const { cooldown_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const _jsT = require("../modules/jsTools/_jsT");

const config_player = require("../configs/config_player.json");
const config_bot = require("../configs/config_bot.json");

module.exports = {
	options: { icon: "🎱", deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("random")
        .setDescription("Get a random amount of carrots"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		/// Check if the user has an active cooldown :: { RANDOM }
		let cooldown_random = await userManager.cooldowns.check(interaction.user.id, "random");
		// prettier-ignore
		if (cooldown_random) return await cooldown_ES.send({
            interaction, ephemeral: true,
            description: `You can use random again **${cooldown_random}**`
        });

		// prettier-ignore
		// Create the embed :: { RANDOM }
		let embed_random = new BetterEmbed({
			interaction, author: { text: "$USERNAME | random", user: interaction.member },
			description: "You tried your luck and did not win anything"
		});

		// Check if the user won
		if (!_jsT.chance(config_player.win_rate.RANDOM)) {
			return await Promise.all([
				// Set the user's cooldown
				userManager.cooldowns.set(interaction.user.id, "random"),
				// Update the user's statistics
				userManager.statistics.update(interaction.user.id, {
					$push: { "random.win_rate": { won: false, timestamp: Date.now() } },
					$inc: { commands_used: 1 }
				}),
				// Send the embed
				embed_random.send()
			]);
		}

		// Fetch the user from Mongo
		let userData = await userManager.fetch(interaction.client.id, { type: "balance" });

		/// Calculate the user's reward
	}
};
