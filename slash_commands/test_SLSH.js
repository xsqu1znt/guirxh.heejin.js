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
            interaction, showTimestamp: true,
            author: { iconURL: null, user: interaction.user },
            title: { text: "\`📬\` You have a message!" }
        });

        embed_dailyReminder.addFields(
            { name: "Reminders", value: ">>> Your \`Daily\` is available!\nYour \`Weekly\` is available!" }
        );

        return await embed_dailyReminder.send();
    }
};