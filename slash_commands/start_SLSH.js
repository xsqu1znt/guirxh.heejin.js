const { Client, CommandInteraction, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const { userSettings, botSettings } = require('../configs/heejinSettings.json');
const { messageTools } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');

module.exports = {
    builder: new SlashCommandBuilder().setName("start")
        .setDescription("Start your journey"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Create a base embed
        const embedinator = new messageTools.Embedinator(interaction, {
            title: "Welcome, %USER!", author: interaction.user
        });

        // Check if the user already started the bot
        if (await userManager.exists(interaction.user.id)) {
            embedinator.setTitle("%USER | start");
            return await embedinator.send("You already started the bot.");
        }

        // Add the user to the Mongo database
        await userManager.new(interaction.user.id);

        // Let the user know the result
        return await embedinator.send(`You got \`${botSettings.currencyIcon} ${userSettings.currency.startingBalance}\``);
    }
};