const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { BetterEmbed } = require('../modules/discordTools');
const questManager = require('../modules/questManager');

module.exports = {
    builder: new SlashCommandBuilder().setName("quest")
        .setDescription("View quests"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let embed_quest = new BetterEmbed({
            interaction, author: { text: "%AUTHOR_NAME | quest", user: interaction.member },
            description: "There are no quests right now"
        });

        if (!questManager.exists()) return await embed_quest.send();

        let quests_f = questManager.toString();

        embed_quest.addFields(quests_f.map(quest_f => ({
            name: quest_f.title, value: `${quest_f.progress}\n${quest_f.description}`,
            inline: true
        })));

        return await embed_quest.send({ description: " " });
    }
};