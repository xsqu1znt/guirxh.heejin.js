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
        //! Basic embed to test database
        /* let embed_basic = new BetterEmbed({ interaction, title: { text: "beep" } });
        return await embed_basic.send(); */

        //! Quest complete
        let embed_questRequirementComplete = new BetterEmbed({
            // interaction: interaction, author: { text: `📜 Dev Quest | Progress` },
            interaction: interaction,
            title: {
                user: interaction.member, iconURL: null,
                text: `Good job! ${interaction.member.displayName} has completed 'Dev Quest'`
            },
            // title: {text: \`📜\` Dev Quest | Progress}`,
            description: `You got:\n>>> \`🥕 10k\` \`🎀 100\` \`XP 1k\` \`🃏 3\``
        });

        return await embed_questRequirementComplete.send();

        //! Quest requirement complete
        /* let embed_questRequirementComplete = new BetterEmbed({
            // interaction: interaction, author: { text: `📜 Dev Quest | Progress` },
            interaction: interaction,
            title: {
                user: interaction.member, iconURL: null,
                text: `Good job! ${interaction.member.displayName} has finished a quest objective!`
            },
            // title: {text: \`📜\` Dev Quest | Progress}`,
            description: `> Dev Quest :: \`🥕 500\`\n\n\`📈 0/2\` :: \`ending\` \`time\``
        });

        return await embed_questRequirementComplete.send(); */

        //! Quest completion DM
        /* let quest = questManager.quests[0];
        let cards_randon = [...Array(2)].map(() => cardManager.toString.basic(
            cardManager.resetUID(cardManager.get.random())
        ));

        let embed_quest = new BetterEmbed({
            interaction, title: { text: `\`📜\` Quest complete :: **${quest.name}**` },
            description: `Rewards:\n>>> ${quest.rewards}\n${cards_randon.join("\n")}`
        });

        return await embed_quest.send(); */
    }
};