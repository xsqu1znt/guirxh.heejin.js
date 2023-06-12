const {
    Client, CommandInteraction, SlashCommandBuilder, ActionRowBuilder,
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');

const { communityServer, botSettings: { currencyIcon, customEmojis } } = require('../configs/heejinSettings.json');
const { BetterEmbed, EmbedNavigator } = require('../modules/discordTools');
const cardManager = require('../modules/cardManager');

module.exports = {
    builder: new SlashCommandBuilder().setName("test")
        .setDescription("A test command for dev stuff"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        //! Footer tesr
        let embed_footer = new BetterEmbed({
            interaction, footer: { text: "footer" }
        });

        return await embed_footer.send();

        //! Drop rework
        /* let cards = [...Array(5)].map(() => cardManager.get.drop("general"));
        cards.forEach(card => card.uid = cardManager.createUID());

        let card_last = cards.slice(-1)[0];
        let cards_f = cards.map(card => cardManager.toString.inventory(card, { simplify: true }));

        let embed_drop = new BetterEmbed({
            interaction, author: { text: "%AUTHOR_NAME | drop", user: interaction.member },
            description: cards_f.join("\n"), imageURL: card_last.imageURL
        });

        let carrotButtonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("btn_sell").setLabel(currencyIcon).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("btn_vault").setLabel("🔒").setStyle(ButtonStyle.Secondary)
        );

        await embed_drop.send({ components: carrotButtonRow });

        ///
        let embed_dropSell = new BetterEmbed({
            interaction, author: { text: "%AUTHOR_NAME | sell", user: interaction.member },
            description: "Use the buttons to select what cards you want to sell"
        });

        let sellButtonRow = new ActionRowBuilder().addComponents(cards.map((card, idx) =>
            new ButtonBuilder().setCustomId(`btn_${idx}`).setEmoji(customEmojis.numbers[idx].emoji).setStyle(ButtonStyle.Secondary)
        ));

        // let sellSelectMenuRow = new ActionRowBuilder().addComponents(
        //     new StringSelectMenuBuilder().setCustomId("ssm").setMaxValues(cards.length).addOptions(
        //         cards.map((card, idx) =>
        //             new StringSelectMenuOptionBuilder().setLabel(`${card.group} - ${card.name}`).setValue(`ssmo_${idx}`)
        //         )
        //     )
        // );

        let sellConfirmButtonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`btn_confirm`).setLabel("Confirm").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`btn_cancel`).setLabel("Cancel").setStyle(ButtonStyle.Danger)
        );

        await embed_dropSell.send({ method: "send", components: [sellButtonRow, sellConfirmButtonRow] });

        ///
        let embed_dropVault = new BetterEmbed({
            interaction, author: { text: "%AUTHOR_NAME | vault", user: interaction.member },
            description: "Use the buttons to select what cards you want to vault"
        });

        let vaultButtonRow = new ActionRowBuilder().addComponents(cards.map((card, idx) =>
            new ButtonBuilder().setCustomId(`btn_${idx}`).setEmoji(customEmojis.numbers[idx].emoji).setStyle(ButtonStyle.Secondary)
        ));

        // let vaultSelectMenuRow = new ActionRowBuilder().addComponents(
        //     new StringSelectMenuBuilder().setCustomId("ssm").setMaxValues(cards.length).addOptions(
        //         cards.map((card, idx) =>
        //             new StringSelectMenuOptionBuilder().setLabel(`${card.group} - ${card.name}`).setValue(`ssmo_${idx}`)
        //         )
        //     )
        // );

        let vaultConfirmButtonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`btn_confirm`).setLabel("Confirm").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`btn_cancel`).setLabel("Cancel").setStyle(ButtonStyle.Danger)
        );

        await embed_dropVault.send({ method: "send", components: [vaultButtonRow, vaultConfirmButtonRow] }); */

        //! Navigationinator test
        // let embed_array = [...Array(4)].map((e, idx) =>
        //     new BetterEmbed({ interaction, title: { text: `Page ${idx + 1}` } })
        // );

        // let embedNav = new EmbedNavigator({
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
            description: `You got a gift from <@957160832339423242>\n> ${card_f}`,
            imageURL: card.imageURL
        });

        // return await embed_giftRecieved.send();

        await interaction.user.send({ embeds: [embed_giftRecieved] });

        return await interaction.editReply({ content: "sent" }); */
        // return await embed_giftRecieved.send({ description: `You got a gift from <@957160832339423242>\n> ${card_f}` });

        //! Currency gifted
        /* let embed_currencyRecieved = new BetterEmbed({
            interaction, showTimestamp: true,
            author: { iconURL: null, user: interaction.user },
            title: { text: "\`📬\` You have a message!" },
            description: `You got \`${currencyIcon} 1000\` from <@957160832339423242>`
        });

        return await embed_currencyRecieved.send(); */
    }
};