const {
    Client, CommandInteraction, SlashCommandBuilder, ActionRowBuilder,
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');

const { communityServer, botSettings: { currencyIcon, customEmojis } } = require('../configs/heejinSettings.json');
const { BetterEmbed, EmbedNavigation } = require('../modules/discordTools');
const cardManager = require('../modules/cardManager');

module.exports = {
    builder: new SlashCommandBuilder().setName("test")
        .setDescription("A test command for dev stuff"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        //! Drop rework
        let cards = [...Array(5)].map(() => cardManager.get.drop("general"));
        cards.forEach(card => card.uid = cardManager.createUID());
        
        let card_last = cards.slice(-1)[0];
        let cards_f = cards.map(card => cardManager.toString.inventory(card, { simplify: true }));

        let embed_drop = new BetterEmbed({
            interaction, author: { text: "%AUTHOR_NAME | drop", user: interaction.member },
            description: cards_f.join("\n"), imageURL: card_last.imageURL
        });

        return await embed_drop.send();

        //! Navigationinator test
        // let embed_array = [...Array(4)].map((e, idx) =>
        //     new BetterEmbed({ interaction, title: { text: `Page ${idx + 1}` } })
        // );

        // let embedNav = new EmbedNavigation({
        //     interaction, embeds: embed_array,
        //     /* selectMenu: true, */ paginationType: "shortJump"
        // });

        // embed_array.forEach(() => navigationinator.addToSelectMenu());

        // return await embedNav.send();

        //! Join our offical server button
        /* let buttonRow = new ActionRowBuilder().addComponents(new ButtonBuilder()
            .setLabel("Join our offical server!")
            .setStyle(ButtonStyle.Link)
            .setURL(communityServer.url)
        );

        return await interaction.editReply({ components: [buttonRow] }); */

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
        /* let embed_currencyRecieved = new BetterEmbed({
            interaction, showTimestamp: true,
            author: { iconURL: null, user: interaction.user },
            title: { text: "\`📬\` You have a message!" }
        });

        return await embed_currencyRecieved.send({
            description: `You recieved from <@957160832339423242>\n> \`${currencyIcon} 1000\``
        }); */
    }
};