const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools");
const { cooldown_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const jt = require("../modules/jsTools");

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
		let cooldown_random = await userManager.cooldowns.eta(interaction.user.id, "random");
		// prettier-ignore
		if (cooldown_random) return await cooldown_ES.send({
            interaction, description: `Your random will be ready **${cooldown_random}**`
        });

		// prettier-ignore
		// Create the embed :: { RANDOM }
		let embed_random = new BetterEmbed({
			interaction, author: { text: "$USERNAME | random", iconURL: true },
			description: "You tried your luck and did not win anything"
		});

		// prettier-ignore
		// Determine if the user lost
		if (!jt.chance(config_player.win_rate.RANDOM)) return await Promise.all([
			// Set the user's cooldown
			userManager.cooldowns.set(interaction.user.id, "random"),
			// Set the user's reminder
			userManager.reminders.set(interaction.user.id, "random", interaction.channelId),
			// Send the embed
			embed_random.send()
		]);

		/// Calculate the user's reward
		// prettier-ignore
		let reward_carrots = jt.randomNumber(config_player.currency.rewards.random.MIN, config_player.currency.rewards.random.MAX);
		// prettier-ignore
		let reward_xp = jt.randomNumber(config_player.xp.user.rewards.random.MIN, config_player.xp.user.rewards.random.MAX);

		// Fetch the user's balance from Mongo
		let userData = await userManager.fetch(interaction.user.id, { type: "balance" });

		return await Promise.all([
			// Update the user's balance in Mongo
			userManager.balance.increment(interaction.user.id, reward_carrots, "balance", "random"),
			// Update the user's XP in Mongo
			userManager.levels.increment.xp(interaction.user.id, reward_xp, "random"),
			/// Update the user's quest progress
			userManager.quests.increment.level(interaction.user.id, reward_xp, "xp"),
			userManager.quests.increment.balance(interaction.user.id, reward_carrots, "carrot"),
			// Set the user's cooldown/reminder
			userManager.cooldowns.set(interaction.user.id, "random"),
			userManager.reminders.set(interaction.user.id, "random", interaction.channel.id),
			// Send the embed
			embed_random.send({
				description: "You tried your luck and won `$REWARD_CARROTS` `$REWARD_XP`"
					.replace("$REWARD_CARROTS", `${config_bot.emojis.currency_1.EMOJI} ${reward_carrots}`)
					.replace("$REWARD_XP", `☝️ ${reward_xp}XP`),
				footer: `balance: ${config_bot.emojis.currency_1.EMOJI} ${userData.balance + reward_carrots}`
			})
		]);
	}
};
