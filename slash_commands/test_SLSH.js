const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings: { currencyIcon, customEmojis } } = require('../configs/heejinSettings.json');
const { quest_complete_ES } = require('../modules/embedStyles');
const { BetterEmbed } = require('../modules/discordTools');
const questManager = require('../modules/questManager');
const cardManager = require('../modules/cardManager');
const messenger = require('../modules/messenger');

module.exports = {
    builder: new SlashCommandBuilder().setName("test")
        .setDescription("A test command for dev stuff"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        //! Basic embed to test database
        let embed_basic = new BetterEmbed({ interaction, title: { text: "beep" } });

        // await messenger.quest.complete(interaction.user, questManager.quests[0]);
        // await messenger.gift.currency(interaction.user, interaction.guild.members.me.user, 500, 1500);

        return await embed_basic.send();

        //! Quest complete
        /* let embed_questComplete = quest_complete_ES(interaction.member, questManager.quests[0]);

        return await interaction.reply({ embeds: [embed_questComplete] }); */

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