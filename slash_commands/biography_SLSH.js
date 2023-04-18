const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userManager } = require('../modules/mongo');

module.exports = {
    builder: new SlashCommandBuilder().setName("biography")
        .setDescription("Change your profile biography")

        .addStringOption(option => option.setName("text")
            .setDescription("Set it to \"none\" to reset")
            .setRequired(true)),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Get interaction options
        let biography = interaction.options.getString("text");

        // Update the user's biography in Mongo
        await userManager.update(interaction.user.id, {
            biography: biography.toLowerCase() === "none" ? "" : biography
        });

        // Let the user know the result
        return await interaction.editReply({ content: "Your biography has been updated." });
    }
};