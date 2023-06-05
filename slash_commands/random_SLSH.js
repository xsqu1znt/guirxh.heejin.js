const { Client, CommandInteraction, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const { botSettings, userSettings } = require('../configs/heejinSettings.json');
const { randomTools } = require('../modules/jsTools');
const { BetterEmbed } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');

module.exports = {
    builder: new SlashCommandBuilder().setName("random")
        .setDescription("Get a random amount of carrots"),

    helpIcon: "🎱",

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let embed_random = new BetterEmbed({
            interaction, author: { text: "%AUTHOR_NAME | random", user: interaction.member }
        });

        let userData = await userManager.fetch(interaction.user.id, "essential");

        // Check if the user has an active cooldown
        let userCooldownETA = await userManager.cooldowns.check(interaction.user.id, "random");
        if (userCooldownETA) return embed_random.send({ description: `You can use random again **${userCooldownETA}**` });

        // Use rng to determine if the user gets anything
        let { xp: { commands: { random: xp_random } }, currency: { range } } = userSettings;
        let currencyGained = randomTools.number(range.random.min, range.random.max);
        let xpGained = randomTools.number(xp_random.min, xp_random.max);

        let won = randomTools.chance(userSettings.chances.winRandom); if (won) {
            // Update the user
            userData.xp += xpGained;
            userData.balance += currencyGained;

            // Update the user in Mongo
            await userManager.update(interaction.user.id, {
                xp: userData.xp,
                balance: userData.balance
            });
        }

        // Reset the user's cooldown
        await userManager.cooldowns.reset(interaction.user.id, "random");

        // Reset the user's reminder
        await userManager.reminders.reset(
            interaction.user.id, interaction.guild.id, interaction.channel.id,
            interaction.user, "random"
        );

        // Let the user know the result
        return await embed_random.send({
            description: won
                ? `You tried your luck and won \`${botSettings.currencyIcon} ${currencyGained}\``
                : "You tried your luck and did not win anything"
        });
    }
};