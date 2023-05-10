const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings, userSettings } = require('../configs/heejinSettings.json');
const { messageTools } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');
const { dateTools, numberTools } = require('../modules/jsTools');

module.exports = {
    builder: new SlashCommandBuilder().setName("daily")
        .setDescription("Claim your daily reward"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let embed_daily = new messageTools.Embedinator(interaction, {
            title: "%USER | daily", author: interaction.user
        });

        // Check if the user has an active cooldown
        let userCooldownETA = await userManager.cooldowns.check(interaction.user.id, "daily");
        if (userCooldownETA) return embed_daily.send(`You can claim your daily **${userCooldownETA}**`);

        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id, "essential", true);

        let result = ""; let previousDailyStreak = userData.daily_streak;

        // Check if the user broke their streak
        if (userData.daily_streak_expires !== 0 && userData.daily_streak_expires < Date.now()) {
            userData.daily_streak = 1;
            userData.daily_streak_expires = dateTools.fromNow("7d");

            // Change the result
            result = "You lost your %PREVIOUS_STREAK day streak!\nYou recieved %GAINED_CURRENCY.";
        } else {
            userData.daily_streak++;
            userData.daily_streak_expires = dateTools.fromNow("7d");

            // Change the result
            result = "Streak increased to %STREAK!\nYou recieved %GAINED_CURRENCY.";
        }

        // Calculate how much currency the user will get
        let currencyGained = userData.daily_streak > userSettings.currency.daily.maxMultiplier
            ? userSettings.currency.daily.amount * userSettings.currency.daily.maxMultiplier
            : userSettings.currency.daily.amount * (userData.daily_streak || 1);

        // Update the user in Mongo
        await userManager.update(interaction.user.id, {
            daily_streak: userData.daily_streak,
            daily_streak_expires: userData.daily_streak_expires,
            balance: userData.balance + currencyGained,
        });

        // Reset the user's cooldown
        await userManager.cooldowns.reset(interaction.user.id, "daily");

        // Let the user know the result
        const streakMultiplierProgressBar = () => {
            let { maxMultiplier } = userSettings.currency.daily;
            let bar = "";

            for (let i = 0; i < maxMultiplier; i++)
                bar += i < userData.daily_streak ? "■" : "□";

            return bar;
        }

        embed_daily.addFields({
            name: "**Streak Multiplier**",
            value: `%PROGRESS_BAR \`%CURRENT_MULTIPLER / %MAX_MULTIPLER\``
                .replace("%PROGRESS_BAR", streakMultiplierProgressBar())
                .replace("%CURRENT_MULTIPLER", userData.daily_streak > 10 ? 10 : userData.daily_streak)
                .replace("%MAX_MULTIPLER", userSettings.currency.daily.maxMultiplier)
        });

        return await embed_daily.send(result
            .replace("%PREVIOUS_STREAK", `\`${previousDailyStreak}\``)
            .replace("%STREAK", `\`${userData.daily_streak}\``)
            .replace("%GAINED_CURRENCY", `\`${botSettings.currencyIcon} ${currencyGained}\``)
        );
    }
};