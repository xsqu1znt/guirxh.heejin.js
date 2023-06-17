const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings: { currencyIcon, customEmojis } } = require('../configs/heejinSettings.json');
const { BetterEmbed } = require('../modules/discordTools');
const questManager = require('../modules/questManager');
const cardManager = require('../modules/cardManager');

module.exports = {
    builder: new SlashCommandBuilder().setName("test")
        .setDescription("A test command for dev stuff"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        //! Quest completion DM
        let quest = questManager.quests[0];
        let cards_randon = [...Array(2)].map(() => cardManager.toString.basic(
            cardManager.resetUID(cardManager.get.random())
        ));

        let embed_quest = new BetterEmbed({
            interaction, title: { text: `\`📜\` Quest complete :: **${quest.name}**` },
            description: `Rewards:\n>>> ${quest.rewards}\n${cards_randon.join("\n")}`
        });

        return await embed_quest.send();
    }
};