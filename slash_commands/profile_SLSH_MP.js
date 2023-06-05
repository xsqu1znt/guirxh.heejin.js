const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userManager } = require('../modules/mongo');
const { userProfile_ES } = require('../modules/embedStyles');
const { BetterEmbed, EmbedNavigator } = require('../modules/discordTools');

module.exports = {
    builder: new SlashCommandBuilder().setName("profile")
        .setDescription("View your profile")

        .addUserOption(option => option.setName("player")
            .setDescription("View another player's profile"))

        .addStringOption(option => option.setName("bio")
            .setDescription("Change your bio | use \"reset\" to remove")
        ),

    helpIcon: "📈",

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let embed_error = new BetterEmbed({
            interaction, author: { text: "%AUTHOR_NAME | profile", user: interaction.member }
        });

        // Get interaction options
        let user = interaction.options.getUser("player") || interaction.member;
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
            return await embed_error.send({ description: result });
        }

        // Check if the given user exists in Mongo
        let userExists = await userManager.exists(user.id);
        if (!userExists) return await embed_error.send({ description: "That user has not started yet" });

        // Fetch the user from Mongo
        let userData = await userManager.fetch(user.id, "full", true);

        // Create the profile pages
        let { embeds, pageExists } = userProfile_ES(user, userData);

        let embedNav = new EmbedNavigator({ interaction, embeds, selectMenu: true });

        // This page option is always first
        embedNav.addToSelectMenu({ label: "📄 Basic Information", description: "View your basic information", isDefault: true });

        // Add select menu options if necessary
        if (pageExists.badges) embedNav.addToSelectMenu({ label: "📛 User Badges", description: "View your badges" });
        if (pageExists.idol) embedNav.addToSelectMenu({ label: "🏃 Stage Idol", description: "View your stage idol" });
        if (pageExists.favorite) embedNav.addToSelectMenu({ label: "⭐ Favorite Card", description: "View your favorite" });

        // This page option is always last
        embedNav.addToSelectMenu({ label: "🃏 Detailed Collection", description: "View your detailed collection" });

        // Send the embeds with navigation
        return await embedNav.send();
    }
};