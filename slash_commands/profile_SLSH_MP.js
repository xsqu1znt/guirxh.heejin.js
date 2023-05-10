const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userManager } = require('../modules/mongo');
const { userProfile_ES } = require('../modules/embedStyles');
const { messageTools } = require('../modules/discordTools');

module.exports = {
    builder: new SlashCommandBuilder().setName("profile")
        .setDescription("View your profile")

        .addUserOption(option => option.setName("player")
            .setDescription("View another player's profile"))

        .addStringOption(option => option.setName("bio")
            .setDescription("Change your bio | use \"reset\" to remove")
        ),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let embed_profile = new messageTools.Embedinator(interaction, {
            title: "%USER | profile", author: interaction.user
        });

        // Get interaction options
        let user = interaction.options.getUser("player") || interaction.user;
        let biography = interaction.options.getString("bio"); biography &&= biography.trim();

        // Change the user's profile biography if they gave a value
        if (biography) {
            // Update the user's biography in Mongo
            await userManager.update(interaction.user.id, {
                biography: biography.toLowerCase() === "reset" ? "" : biography
            });

            // Let the user know the result
            let result = biography.toLowerCase() === "reset"
                ? "bio reset"
                : `Your bio has been changed to:\n> ${biography}`;
            return await embed_profile.send(result);
        }

        // Check if the given user exists in Mongo
        let userExists = await userManager.exists(user.id);
        if (!userExists) return await embed_profile.send(
            "That user has not started yet"
        );

        // Fetch the user from Mongo
        let userData = await userManager.fetch(user.id, "full", true);

        // Create the profile pages
        let { embeds, pageExists } = userProfile_ES(user, userData);

        // Navigateinator-ify-er 9000!!!!11
        let navigationify = new messageTools.Navigationify(interaction, embeds, {
            selectMenu: true
        });

        // This page option is always first
        navigationify.addSelectMenuOption({ label: "📄 Basic Information", description: "View your basic information", isDefault: true });
        
        // Add select menu options if necessary
        if (pageExists.badges) navigationify.addSelectMenuOption({ label: "📛 User Badges", description: "View your badges" });
        if (pageExists.idol) navigationify.addSelectMenuOption({ label: "🏃 Stage Idol", description: "View your stage idol" });
        if (pageExists.favorite) navigationify.addSelectMenuOption({ label: "⭐ Favorite Card", description: "View your favorite" });
        
        // This page option is always last
        navigationify.addSelectMenuOption({ label: "🃏 Detailed Collection", description: "View your detailed collection" });

        // Send the embed
        return await navigationify.send();
    }
};