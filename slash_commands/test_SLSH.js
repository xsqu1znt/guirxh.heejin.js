const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { BetterEmbed } = require('../modules/discordTools');

module.exports = {
    builder: new SlashCommandBuilder().setName("test")
        .setDescription("A test command for dev stuff"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let embed_dailyReminder = new BetterEmbed({
            interaction,
            author: { text: "%USER | daily", user: interaction.user }
        });

        return await embed_dailyReminder.send({
            description: "Hey there, %USER_MENTION! Your \`Daily\` is available!"
        });
    }
};