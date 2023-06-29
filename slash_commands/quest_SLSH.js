const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { BetterEmbed } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');
// const questManager = require('../modules/questManager');

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

        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id);

        // Parse the current quests
        let quests_f = questManager.toString(userData);

        embed_quest.addFields(quests_f.map(quest_f => ({
            name: quest_f.title, value: quest_f.description, inline: true
        })));

        return await embed_quest.send({ description: " " });
    }
};