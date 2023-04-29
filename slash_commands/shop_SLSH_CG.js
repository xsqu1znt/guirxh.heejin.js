const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { globalShop_ES } = require('../modules/embedStyles');
const { messageTools } = require('../modules/discordTools');
const { dateTools } = require('../modules/jsTools');

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

        navigationify.addSelectMenuOption({ label: "Option 1", isDefault: true });
        navigationify.addSelectMenuOption({ label: "Option 2" });
        navigationify.addSelectMenuOption({ label: "Option 3" });

        navigationify.toggleSelectMenu();
        navigationify.togglePagination();

        return await navigationify.send();

        /* // Paginatation-ify-inator 9000!!!!11
        return await messageTools.paginationify(interaction, embed_shop, {
            timeout: dateTools.parseStr(botSettings.timeout.pagination)
        }); */
    }
};