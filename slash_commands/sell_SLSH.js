const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings: { currencyIcon } } = require('../configs/heejinSettings.json');
const { BetterEmbed, messageTools } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');
const userParser = require('../modules/userParser');
const cardManager = require('../modules/cardManager');

module.exports = {
    builder: new SlashCommandBuilder().setName("sell")
        .setDescription("Sell a card in your inventory")

        .addStringOption(option => option.setName("uid")
            .setDescription("Use UID separate by comma")
            .setRequired(true)),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let embed_sell = new BetterEmbed({
            interaction, author: { text: "%AUTHOR_NAME | sell", user: interaction.member },
            description: "You need to give a valid card UID"
        });

        // Get interaction options
        let uids = interaction.options.getString("uid").replace(/ /g, "").split(",");
        if (!Array.isArray(uids)) uids = [uids];

        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id, "full", true);

        // Get the cards from the user's card_inventory
        let cards_toSell = userParser.cards.getMultiple(userData.card_inventory, uids);
        if (!cards_toSell.length) return await embed_sell.send();

        // Filter out locked and favorited cards
        cards_toSell = cards_toSell.filter(card =>
            !card?.locked
            && card.uid !== userData.card_favorite_uid
            && card.uid !== userData.card_selected_uid
            && !userData.card_team_uids.includes(card.uid)
        );
        if (cards_toSell.length === 0) return await embed_sell.send({
            description: "\`%UIDS\` cannot be sold, it is either:\n\`🔒 vault\` \`🧑🏾‍🤝‍🧑 team\` \`🏃 idol\` \`⭐ favorite\`"
                .replace("%UIDS", uids.join(" ").trim())
        });

        // Parse cards_toSell into a human readable string array
        let cards_toSell_f = cards_toSell.map(card => `> ${cardManager.toString.basic(card)}`);
        let sellPriceTotal = 0; cards_toSell.forEach(card => sellPriceTotal += card.sellPrice);

        // Await the user's confirmation
        let confirm_sell = await messageTools.awaitConfirmation(interaction, {
            description: "**Are you sure you want to sell:**\n%CARDS"
                .replace("%CARDS", cards_toSell_f.join("\n")),
            footer: `total: ${currencyIcon} ${sellPriceTotal}`,
            showAuthor: true
        });

        // Sell the cards
        if (confirm_sell) {
            // Let the user know sell failed
            if (!await userManager.cards.sell(interaction.user.id, cards_toSell)) return await embed_sell.send({
                description: "Can not sell cards that are not in your inventory",
                method: "send"
            });

            // Let the user know the result
            embed_sell.setFooter({ text: `total: ${currencyIcon} ${sellPriceTotal}` });
            return await embed_sell.send({
                description: `You sold:\n${cards_toSell_f.join("\n")}`,
                method: "send"
            });
        }
    }
};