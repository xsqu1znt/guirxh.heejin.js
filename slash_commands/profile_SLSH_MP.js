const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userManager } = require('../modules/mongo');
const { userProfile_ES } = require('../modules/embedStyles');
const { messageTools } = require('../modules/discordTools');

module.exports = {
    builder: new SlashCommandBuilder().setName("profile")
        .setDescription("View your profile")

        .addUserOption(option => option.setName("player")
            .setDescription("View another player's profile"))

        .addBooleanOption(option => option.setName("compact")
            .setDescription("Toggle to show less information in your profile"))

        .addStringOption(option => option.setName("biography")
            .setDescription("Change your biography | use \"reset\" to remove")
        ),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Reusable embedinator to send success/error messages
        const embedinator = new messageTools.Embedinator(interaction, {
            title: "%USER | profile", author: interaction.user
        });

        // Get interaction options
        let user = interaction.options.getUser("player") || interaction.user;
        let compact = interaction.options.getBoolean("compact") || false;
        let biography = interaction.options.getString("biography"); biography &&= biography.trim();

        // Change the user's profile biography if they gave a value
        if (biography) {
            // Update the user's biography in Mongo
            await userManager.update(interaction.user.id, {
                biography: biography.toLowerCase() === "reset" ? "" : biography
            });

            // Let the user know the result
            let result = biography.toLowerCase() === "reset"
                ? "Biography reset."
                : `Your biography has been changed to:\n> ${biography}`;
            return await embedinator.send(result);
        }

        // Check if the given user exists in Mongo
        let userExists = await userManager.exists(user.id);
        if (!userExists) return await embedinator.send(
            "That user hasn't started yet."
        );

        let userData = await userManager.fetch(user.id, "full", true);
        let embed_profile = userProfile_ES(user, userData, compact);

        return await interaction.editReply({ embeds: [embed_profile] });
    }
};