const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userProfile_ES } = require('../modules/embedStyles');

module.exports = {
    builder: new SlashCommandBuilder().setName("profile")
        .setDescription("View your profile"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let embed_profile = userProfile_ES(interaction.user);

        return await interaction.reply({ embeds: [embed_profile] });
    }
};