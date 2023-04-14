const { Client, CommandInteraction, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const { userSettings, botSettings } = require('../configs/heejinSettings.json');
const { userManager } = require('../modules/mongo');

module.exports = {
    builder: new SlashCommandBuilder().setName("start")
        .setDescription("Start your journey"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        await userManager.new(interaction.user.id);

        let embed_start = new EmbedBuilder()
            .setAuthor({ name: `Welcome, ${interaction.user.username}!`, iconURL: interaction.user.avatarURL({ dynamic: true }) })
            .setDescription(`You got \`${botSettings.currencyIcon} ${userSettings.startingBalance}\``)
            .setColor(botSettings.embedColor || null);

        return await interaction.editReply({ embeds: [embed_start] });
    }
};