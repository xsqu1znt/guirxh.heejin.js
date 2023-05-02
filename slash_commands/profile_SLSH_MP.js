const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userManager } = require('../modules/mongo');
const { userProfile_ES } = require('../modules/embedStyles');
const { messageTools } = require('../modules/discordTools');

module.exports = {
    builder: new SlashCommandBuilder().setName("profile")
        .setDescription("View your profile")

        .addUserOption(option => option.setName("player")
            .setDescription("View another player's profile"))

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

        // Fetch the user from Mongo
        let userData = await userManager.fetch(user.id, "full", true);

        // Create the profile pages
        let { embeds, pageExists } = userProfile_ES(user, userData);

        // Navigateinator-ify-er 9000!!!!11
        let navigationify = new messageTools.Navigationify(interaction, embeds, {
            selectMenu: (Object.values(pageExists).find(exists => exists))
        });

        // Add select menu options if necessary
        navigationify.addSelectMenuOption({ label: "Info", description: "View your info.", isDefault: true });

        if (pageExists.badges) navigationify.addSelectMenuOption({ label: "Badges", description: "View your badges." });
        if (pageExists.idol) navigationify.addSelectMenuOption({ label: "Idol", description: "View your idol card." });
        if (pageExists.favorite) navigationify.addSelectMenuOption({ label: "Favorite", description: "View your favorite card." });

        // Send the embed
        return await navigationify.send();
    }
};