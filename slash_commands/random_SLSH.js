const { Client, CommandInteraction, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const { botSettings, userSettings } = require('../configs/heejinSettings.json');
const { randomTools, dateTools } = require('../modules/jsTools');
const { messageTools } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');

module.exports = {
    builder: new SlashCommandBuilder().setName("random")
        .setDescription("Get a random amount of carrots"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Reusable embedinator to send success/error messages
        const embedinator = new messageTools.Embedinator(interaction, {
            title: "%USER | random", author: interaction.user
        });

        let { xp: { xpRange }, currency: { currencyRange } } = userSettings;
        let userData = await userManager.fetch(interaction.user.id, "essential");

        // Check if the user has an active cooldown
        let cooldownETA_random = dateTools.eta(userData.cooldowns.get("random"), true);
        if (cooldownETA_random) return await embedinator.send(
            `You can use random again **${cooldownETA_random}**.`
        );

        let xpGained = randomTools.number(xpRange.min, xpRange.max);
        let currencyGained = randomTools.number(currencyRange.min, currencyRange.max);

        // Use rng to determine if the user gets anything
        let won = randomTools.chance(userSettings.chances.winRandom); if (won) {
            // Update the user
            userData.xp += xpGained;
            userData.balance += currencyGained;
        }

        // Set the user's cooldown
        userData.cooldowns.set("random", dateTools.fromNow(userSettings.cooldowns.random));

        // Send the update to the database
        await userManager.update(interaction.user.id, {
            xp: userData.xp, balance: userData.balance,
            cooldowns: userData.cooldowns
        });

        // Create the embed
        let embed_random = new EmbedBuilder()
            .setAuthor({ name: `${interaction.user.username} | profile`, iconURL: interaction.user.avatarURL({ dynamic: true }) })
            .setDescription(won
                ? `You tried your luck and won \`${botSettings.currencyIcon} ${currencyGained}\`.`
                : "You tried your luck and didn't win anything."
            )
            .setColor(botSettings.embedColor || null);

        // Let the user know the result
        return await interaction.editReply({ embeds: [embed_random] });
    }
};