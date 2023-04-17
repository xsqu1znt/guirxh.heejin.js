const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userManager } = require('../modules/mongo');
const { userProfile_ES } = require('../modules/embedStyles');

module.exports = {
    builder: new SlashCommandBuilder().setName("profile").setDescription("View your profile"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let userData = await userManager.fetch(interaction.user.id, "full", true);
        let embed_profile = userProfile_ES(interaction.user, userData);

        return await interaction.editReply({ embeds: [embed_profile] });
    }
};