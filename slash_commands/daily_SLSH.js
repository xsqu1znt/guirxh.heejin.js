const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools");
const { cooldown_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const _jsT = require("../modules/jsTools");

const config_player = require("../configs/config_player.json");
const config_bot = require("../configs/config_bot.json");

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

		// The resulting embed description
		let embed_description = `Streak increased to \`${userData.daily_streak + 1}\`\nYou got \`$CURRENCY\``;

		/// Check if the user broke their streak
		let streak_reset = false;

		if (userData.daily_streak_expires && userData.daily_streak_expires < Date.now()) {
			// Change the resulting embed description
			embed_description = `You lost your streak of \`${userData.daily_streak}\`\nYou got \`$CURRENCY\``;
			// Reset the user's daily streak
			userData.daily_streak = 0;
			streak_reset = true;
		}

		// Update the user's daily streak expiration timestamp
		userData.daily_streak_expires = _jsT.parseTime("7d", { fromNow: true });

		// prettier-ignore
		// Calculate the user's daily reward
		let reward_carrots = userData.daily_streak > config_player.currency.rewards.daily.MAX_STREAK_MULTIPLIER
            ? config_player.currency.rewards.daily.AMOUNT * config_player.currency.rewards.daily.MAX_STREAK_MULTIPLIER
            : config_player.currency.rewards.daily.AMOUNT * (userData.daily_streak || 1);

		await Promise.all([
			// Update the user's balance in Mongo
			userManager.balance.increment(interaction.user.id, reward_carrots, "carrots", "daily"),
			// Update the user's daily streak in Mongo
			userManager.update(interaction.user.id, {
				$inc: { daily_streak: streak_reset ? -userData.daily_streak : 1 },
				$set: { daily_streak_expires: userData.daily_streak_expires }
			}),
			// Update the user's quest progress
			userManager.quests.increment.balance(interaction.user.id, reward_carrots),
			// Set the user's cooldown
			userManager.cooldowns.set(interaction.user.id, "daily"),
			// Set the user's reminder
			userManager.reminders.set(interaction.user.id, "daily")
		]);

		/// Create the embed :: { DAILY }
		// Update the resulting embed description with the currrency the user got
		embed_description = embed_description.replace("$CURRENCY", `${config_bot.emojis.currency_1.EMOJI}${reward_carrots}`);

		// prettier-ignore
		let embed_daily = new BetterEmbed({
            interaction, author: { text: "$USERNAME | daily", user: interaction.member },
            description: embed_description
        });

		let streak_clamped = _jsT.clamp(userData.daily_streak + 1, {
			max: config_player.currency.rewards.daily.MAX_STREAK_MULTIPLIER
		});
		let streak_progress = [...Array(config_player.currency.rewards.daily.MAX_STREAK_MULTIPLIER)].fill("□");
		streak_progress.splice(0, streak_clamped, ...Array(streak_clamped).fill("■"));

		embed_daily.addFields({
			name: "***Streak multiplier***",
			value: `${streak_progress.join("")}`
		});

		return await embed_daily.send();
	}
};
