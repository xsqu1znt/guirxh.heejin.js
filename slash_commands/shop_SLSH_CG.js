const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { globalShop_ES } = require('../modules/embedStyles');
const { messageTools } = require('../modules/discordTools');
const { arrayTools, dateTools } = require('../modules/jsTools');
const cardManager = require('../modules/cardManager');

module.exports = {
    builder: new SlashCommandBuilder().setName("shop")
        .setDescription("View the shop"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Build the set collection pages
        let embed_shop = globalShop_ES(interaction.user);

        // Navigateinator-ify-er 9000!!!!11
        let navigationify = new messageTools.Navigationify(interaction, [embed_shop], {
            timeout: dateTools.parseStr(botSettings.timeout.pagination)
        });

        // Get an array of unique cards based on the set ID
        let shopCards_unique = arrayTools.unique(cardManager.cards_shop,
            (card, compareCard) => card.setID === compareCard.setID
        );

        // Add a select menu option for each card group
        shopCards_unique.forEach((card, idx) => navigationify.addSelectMenuOption({
            label: card.group,
            isDefault: (idx === 0)
        }));

        // Add the an option to view the badge shop
        navigationify.addSelectMenuOption({ label: "Badges" });

        navigationify.toggleSelectMenu();
        navigationify.togglePagination();

        return await navigationify.send();

        /* // Paginatation-ify-inator 9000!!!!11
        return await messageTools.paginationify(interaction, embed_shop, {
            timeout: dateTools.parseStr(botSettings.timeout.pagination)
        }); */
    }
};