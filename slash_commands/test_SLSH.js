const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings: { currencyIcon } } = require('../configs/heejinSettings.json');
const { BetterEmbed } = require('../modules/discordTools');
const cardManager = require('../modules/cardManager');

module.exports = {
    builder: new SlashCommandBuilder().setName("test")
        .setDescription("A test command for dev stuff"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        //! Daily/weekly DM reminder
        /* let embed_dailyReminder = new BetterEmbed({
            interaction, showTimestamp: true,
            author: { iconURL: null, user: interaction.user },
            title: { text: "\`📬\` You have a message!" }
        });

        embed_dailyReminder.addFields(
            { name: "Reminders", value: ">>> Your \`Daily\` is available!\nYour \`Weekly\` is available!" }
        );

        return await embed_dailyReminder.send(); */

        //! Card gifted
        /* let card = cardManager.get.random();
        card.uid = cardManager.createUID();

        let card_f = cardManager.toString.inventory(card, { simplify: true });

        let embed_giftRecieved = new BetterEmbed({
            interaction, showTimestamp: true,
            author: { iconURL: null, user: interaction.user },
            title: { text: "\`📬\` You have a message!" },
            imageURL: card.imageURL
        });

        return await embed_giftRecieved.send({ description: `You got a gift from <@957160832339423242>\n> ${card_f}` }); */

        //! Currency gifted
        let embed_currencyRecieved = new BetterEmbed({
            interaction, showTimestamp: true,
            author: { iconURL: null, user: interaction.user },
            title: { text: "\`📬\` You have a message!" }
        });

        return await embed_currencyRecieved.send({
            description: `You recieved from <@957160832339423242>\n> \`${currencyIcon} 1000\``
        });
    }
};