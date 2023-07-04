const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { communityServer, botSettings, userSettings } = require('../configs/heejinSettings.json');
const { BetterEmbed } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');

module.exports = {
    options: { icon: "🏎️", deferReply: false, dontRequireUserData: true },

    builder: new SlashCommandBuilder().setName("start")
        .setDescription("Start your journey"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Check if the user already started the bot
        if (await userManager.exists(interaction.user.id)) return await new BetterEmbed({
            interaction, author: { text: "%AUTHOR_NAME | start", user: interaction.member },
            description: "You already started"
        }).send();

        // Defer the reply
        await interaction.deferReply();

        // Add the user to the Mongo database
        await userManager.new(interaction.user.id);

        // Create the start embed and send it
        return await new BetterEmbed({
            interaction, author: { text: "Welcome, %AUTHOR_NAME!", user: interaction.member },
            description: `Welcome to **Heejin 2.0**\nThank you for showing interest in playing our bot \`❤️\`\n\n> \`01.\` You can start your journey by using any of our \`/drop\` commands. \n> \`02.\` You can view \`/inventory\` to see all cards you own and \`/profile\` to view all your basic information.\n> \`03.\` There is a bunch of commands out there waiting for you to use.\n> Example: Use \`/set\` to add all your faves to all these places: \n> \`🔒 vault\` \`👯 team\` \`🏃 idol\` \`⭐ favorite\`\n\n*There's so much more waiting for you!*\nHope you enjoy playing! You can join our server by [**clicking here**](${communityServer.url})\n\n> **You got**: \`${botSettings.currencyIcon} ${userSettings.currency.startingBalance}\``
        }).send();
    }
};