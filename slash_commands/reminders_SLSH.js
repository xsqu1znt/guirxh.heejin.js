const { Client, CommandInteraction, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const { botSettings, userSettings } = require('../configs/heejinSettings.json');
const { userManager } = require('../modules/mongo');
const { stringTools } = require('../modules/jsTools');

// Reminder choices
const cooldownValues = Object.keys(userSettings.cooldowns);
const stringChoices = cooldownValues.map(value => ({
    name: stringTools.toTitleCase(value.replace(/_/g, " ")),
    value
}));

module.exports = {
    builder: new SlashCommandBuilder().setName("reminders")
        .setDescription("Toggle reminders for a command cooldown")

        .addStringOption(option => option.setName("for")
            .setDescription("The command you want to toggle being reminded for")
            .setRequired(true)

            .addChoices(...stringChoices)
        ),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Get interaction options
        let reminderType = interaction.options.getString("for");

        // Toggle whether the reminder is enabled or not for the user
        let toggle = await userManager.reminders.toggle(interaction.user.id, reminderType);

        // Create the reminder toggle embed
        let embed_rToggle = new EmbedBuilder()
            .setAuthor({ name: `${interaction.user.username} | reminder`, iconURL: interaction.user.avatarURL({ dynamic: true }) })
            .setDescription("Reminders for %REMINDER_TYPE have been %TOGGLE"
                .replace("%REMINDER_TYPE", `\`${stringTools.toTitleCase(reminderType.replace(/_/g, " "))}\``)
                .replace("%TOGGLE", toggle ? "**enabled**" : "**disabled**")
            )
            .setColor(botSettings.embed.color);

        // Let the user know the result
        return await interaction.editReply({ embeds: [embed_rToggle] });
    }
};