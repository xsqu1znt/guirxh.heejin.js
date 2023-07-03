const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { BetterEmbed } = require('../modules/discordTools');
const { userQuest_ES } = require('../modules/embedStyles');
const { questManager } = require('../modules/mongo/index');

module.exports = {
    builder: new SlashCommandBuilder().setName("quest")
        .setDescription("View quests"),

    options: { deferReply: true },

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let embed_error = new BetterEmbed({ interaction, author: { text: "%AUTHOR_NAME | quest", user: interaction.member } });

        // Check if there are active quests
        if (!questManager.quests.length) return await embed_error.send({
            description: "There are no quests right now"
        });

        // Create the embed
        let embed_quests = await userQuest_ES(interaction.member);

        // Send the embed
        return await interaction.editReply({ embeds: [embed_quests] });
    }
};