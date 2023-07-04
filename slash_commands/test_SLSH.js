const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings: { currencyIcon, customEmojis } } = require('../configs/heejinSettings.json');
const { quest_objectiveComplete_ES } = require('../modules/embedStyles');
const { BetterEmbed } = require('../modules/discordTools');
const cardManager = require('../modules/cardManager');
const messenger = require('../modules/messenger');
const userParser = require('../modules/userParser');
const { userManager } = require('../modules/mongo');

module.exports = {
    options: { deferReply: false },

    builder: new SlashCommandBuilder().setName("test")
        .setDescription("A test command for dev stuff"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        //! Basic embed to test database
        let embed_basic = new BetterEmbed({ interaction, title: { text: "beep" } });

        // let userData = await userManager.fetch(interaction.user.id);
        // console.log(userParser.cards.setsCompleted(userData, ["220"]));

        // await messenger.quest.complete(interaction.user, questManager.quests[0]);
        // await messenger.gift.currency(interaction.user, interaction.guild.members.me.user, 500, 1500);

        return await embed_basic.send();

        //! Quest complete
        /* let embed_questComplete = quest_complete_ES(interaction.member, questManager.quests[0]);

        return await interaction.reply({ embeds: [embed_questComplete] }); */

        //! Quest requirement complete
        /* let embed_objectiveComplete = quest_objectiveComplete_ES(interaction.member, {
            id: "q01", f: "1/3", objectives_just_complete: ["balance", "cards_in_inventory"], quest: { name: "Test", date: { end: "2023-07-02" } }
        });

        return await interaction.reply({ embeds: [embed_objectiveComplete] }); */

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