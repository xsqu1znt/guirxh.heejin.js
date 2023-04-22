const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userManager } = require('../modules/mongo');
const { messageTools } = require('../modules/discordTools');

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
        // Reusable embedinator to send success/error messages
        const embedinator = new messageTools.Embedinator(interaction, {
            title: "%USER | biography", author: interaction.user
        });

        // Get interaction options
        let biography = interaction.options.getString("text").trim();

        // Update the user's biography in Mongo
        await userManager.update(interaction.user.id, {
            biography: biography.toLowerCase() === "none" ? "" : biography
        });

        // Let the user know the result
        return await embedinator.send(`Your biography has been changed to: \"${biography}\"`);
    }
};