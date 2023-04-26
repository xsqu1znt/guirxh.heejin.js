const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userManager } = require('../modules/mongo');
const { messageTools } = require('../modules/discordTools');

module.exports = {
    builder: new SlashCommandBuilder().setName("biography")
        .setDescription("Change your profile biography")

        .addStringOption(option => option.setName("text")
            .setDescription("Use \"reset\" to remove")
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
            biography: biography.toLowerCase() === "reset" ? "" : biography
        });

        // Let the user know the result
        let result = biography.toLowerCase() === "reset"
            ? "Biography reset."
            : `Your biography has been changed to: \"${biography}\".`;
        return await embedinator.send(result);
    }
};