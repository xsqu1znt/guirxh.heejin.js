const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userManager } = require('../modules/mongo');
const { userProfile_ES } = require('../modules/embedStyles');

module.exports = {
    builder: new SlashCommandBuilder().setName("profile")
        .setDescription("View your profile")

        .addUserOption(option => option.setName("player")
            .setDescription("View another player's profile"))

        .addBooleanOption(option => option.setName("compact")
            .setDescription("Toggle to show less information in your profile")),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Get interaction options
        let user = interaction.options.getUser("player") || interaction.user;
        let compact = interaction.options.getBoolean("compact") || false;

        // Check if the given user exists in Mongo
        let userExists = await userManager.exists(user.id);
        if (!userExists) return await interaction.editReply({
            content: "That user hasn't started yet."
        });

        let userData = await userManager.fetch(user.id, "full", true);
        let embed_profile = userProfile_ES(user, userData, compact);

        return await interaction.editReply({ embeds: [embed_profile] });
    }
};