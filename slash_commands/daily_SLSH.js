const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed, markdown } = require("../modules/discordTools");
const { cooldown_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const _jsT = require("../modules/jsTools");

const config = {
	player: require("../configs/config_player.json"),
	bot: require("../configs/config_bot.json")
};

module.exports = {
	options: { icon: "💖", deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("daily")
        .setDescription("Claim your daily reward"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		/// Check if the user has an active cooldown :: { DAILY }
		let cooldown_daily = await userManager.cooldowns.eta(interaction.user.id, "daily");
		// prettier-ignore
		if (cooldown_daily) return await cooldown_ES.send({
			interaction, description: `You can claim your daily **${cooldown_daily}**`, ephemeral: true
        });

		// Fetch the user from Mongo
		let userData = await userManager.fetch(interaction.user.id, { type: "essential" });

		/* - - - - - { Streak Managment } - - - - - */
		let streakReset = userData.daily_streak_expires && userData.daily_streak_expires < Date.now();

		// Reset the user's daily streak if needed
		if (streakReset) userData.daily_streak = 0;

		// Update the user's daily streak expiration timestamp
		userData.daily_streak_expires = _jsT.parseTime("7d", { fromNow: true });

		/* - - - - - { Calculate Rewards } - - - - - */
		let config_daily = config.player.currency.rewards.daily;

		// prettier-ignore
		let reward_carrots = userData.daily_streak > config_daily.MAX_STREAK_MULTIPLIER
            ? config_daily.AMOUNT * config_daily.MAX_STREAK_MULTIPLIER
			: config_daily.AMOUNT * (userData.daily_streak || 1);

		await Promise.all([
			// Update the user's balance in Mongo
			userManager.balance.increment(interaction.user.id, reward_carrots, "carrots", "daily"),
			// Update the user's daily streak in Mongo
			userManager.update(interaction.user.id, {
				$inc: { daily_streak: streakReset ? -userData.daily_streak : 1 },
				$set: { daily_streak_expires: userData.daily_streak_expires }
			}),
			// Set the user's cooldown
			userManager.cooldowns.set(interaction.user.id, "daily"),
			// Set the user's reminder
			userManager.reminders.set(interaction.user.id, "daily"),

			// Update the user's quest progress
			userManager.quests.increment.balance(interaction.user.id, reward_carrots, "carrot"),
			// Update the user's statistics
			userManager.statistics.push.balance(interaction.user.id, reward_carrots, "carrot", "daily")
		]);

		/* - - - - - { Create the Embed } - - - - - */
		/// Create the streak progress bar
		let daily_streak_clamped = _jsT.clamp(userData.daily_streak + 1, { max: config_daily.MAX_STREAK_MULTIPLIER });
		let streakProgress = Array(config_daily.MAX_STREAK_MULTIPLIER).fill("▱");
		streakProgress.splice(0, daily_streak_clamped, ...Array(daily_streak_clamped).fill("▰"));

		// prettier-ignore
		let _description = (streakReset
			? `You lost your streak of ${userData.daily_streak}`
			: `Streak increased to ${userData.daily_streak + 1}`);

		// prettier-ignore
		// Create the embed :: { DAILY }
		let embed_daily = new BetterEmbed({
            interaction, author: { text: "$USERNAME | daily", iconURL: true },
			description: "```ansi\n$HEADER\n\n$REWARDS\n```"
				.replace("$HEADER", markdown.ansi(`${_description}\nMultiplier: ${streakProgress.join("")}`, { format: "bold", text_color: streakReset ? "red" : "yellow" }))
				.replace("$REWARDS", markdown.ansi(`You got ${config.bot.emojis.currency_1.EMOJI} ${reward_carrots}`, { text_color: "white" }))
		});

		return await embed_daily.send();
	}
};
