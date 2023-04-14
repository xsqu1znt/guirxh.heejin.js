const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userCooldowns_ES } = require('../modules/embedStyles');

module.exports = {
    builder: new SlashCommandBuilder().setName("cooldowns")
        .setDescription("Check your cooldowns"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let embed_cooldowns = userCooldowns_ES(interaction.user);

        return await interaction.reply({ embeds: [embed_cooldowns] });
    }
};