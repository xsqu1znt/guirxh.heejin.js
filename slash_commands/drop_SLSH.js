const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userSettings } = require('../configs/heejinSettings.json');
const { randomTools, dateTools } = require('../modules/jsTools');
const { generalDrop_ES } = require('../modules/embedStyles');
const { userManager } = require('../modules/mongo');
const cardManager = require('../modules/cardManager');

module.exports = {
    builder: new SlashCommandBuilder().setName("drop")
        .setDescription("Drop a random card")

        .addSubcommand(subcommand => subcommand
            .setName("1")
            .setDescription("Get a random card of any rarity"))
        .addSubcommand(subcommand => subcommand
            .setName("2")
            .setDescription("Get a random card of any rarity"))

        .addSubcommand(subcommand => subcommand
            .setName("3")
            .setDescription("Get a random rare/epic/mint card"))
        .addSubcommand(subcommand => subcommand
            .setName("4")
            .setDescription("Get a random rare/epic/mint card"))

        .addSubcommand(subcommand => subcommand
            .setName("weekly")
            .setDescription("Get a random card from the shop"))

        .addSubcommand(subcommand => subcommand
            .setName("seasonal")
            .setDescription("Get a random seasonal card"))

        .addSubcommand(subcommand => subcommand
            .setName("event")
            .setDescription("Get a random event card")),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let userData = await userManager.fetch(interaction.user.id, "essential");
        let dropEmbedTitle = "";
        let dropCooldownType = "";
        let card;

        /* // Check if the user has an active cooldown
        let cooldownETA_drop1 = dateTools.eta(userData.cooldowns.get("drop_1"), true);
        if (cooldownETA_drop1) return await interaction.editReply({
            content: `You can drop again **${cooldownETA_drop1}**.`
        }); */

        /* // Set the user's cooldown
        userData.cooldowns.set("drop_1", dateTools.fromNow(userSettings.cooldowns.drop_1)); */

        switch (interaction.options.getSubcommand()) {
            case "1":
                dropEmbedTitle = "drop 1"; dropCooldownType = "drop_1";
                card = cardManager.randomDrop("drop");
                break;

            case "2":
                dropEmbedTitle = "drop 2"; dropCooldownType = "drop_2";
                card = cardManager.randomDrop("drop");
                break;

            case "3":
                dropEmbedTitle = "drop 3"; dropCooldownType = "drop_3";
                card = cardManager.randomDrop("drop_3_4");
                break;

            case "4":
                dropEmbedTitle = "drop 4"; dropCooldownType = "drop_4";
                card = cardManager.randomDrop("drop_3_4");
                break;

            case "weekly":
                dropEmbedTitle = "weekly"; dropCooldownType = "drop_weekly";
                card = cardManager.randomDrop("weekly");
                break;

            case "seasonal":
                dropEmbedTitle = "seasonal"; dropCooldownType = "drop_seasonal";
                card = cardManager.randomDrop("seasonal");
                break;

            case "event": // TODO: use bot config for dynamic event name
                dropEmbedTitle = "event"; dropCooldownType = "drop_event";
                card = cardManager.randomDrop("event");
                break;
        }

        // Check if the user has an active cooldown
        let cooldownETA_drop = dateTools.eta(userData.cooldowns.get(dropCooldownType), true);
        if (cooldownETA_drop) return await interaction.editReply({
            content: `You can drop again **${cooldownETA_drop}**.`
        });

        // Set the user's cooldown
        userData.cooldowns.set(dropCooldownType, dateTools.fromNow(userSettings.cooldowns[dropCooldownType]));

        // Add a unique ID to the card
        card.uid = randomTools.numberString(6);

        let embed_drop = generalDrop_ES(interaction.user, card, dropEmbedTitle);

        return await interaction.editReply({ embeds: [embed_drop] });
    }
};