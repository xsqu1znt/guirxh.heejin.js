const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings, userSettings } = require('../configs/heejinSettings.json');
const { randomTools, dateTools } = require('../modules/jsTools');
const { generalDrop_ES } = require('../modules/embedStyles');
const { userManager } = require('../modules/mongo');
const cardManager = require('../modules/cardManager');

module.exports = {
    builder: new SlashCommandBuilder().setName("drop").setDescription("Drop a random card")
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
        let [dropEmbedTitle, dropCooldownType] = "";
        let card;

        switch (interaction.options.getSubcommand()) {
            case "1":
                dropEmbedTitle = "drop 1"; dropCooldownType = "drop_1";
                card = cardManager.fetch.drop("drop");
                break;

            case "2":
                dropEmbedTitle = "drop 2"; dropCooldownType = "drop_2";
                card = cardManager.fetch.drop("drop");
                break;

            case "3":
                dropEmbedTitle = "drop 3"; dropCooldownType = "drop_3";
                card = cardManager.fetch.drop("drop_3_4");
                break;

            case "4":
                dropEmbedTitle = "drop 4"; dropCooldownType = "drop_4";
                card = cardManager.fetch.drop("drop_3_4");
                break;

            case "weekly":
                dropEmbedTitle = "weekly"; dropCooldownType = "drop_weekly";
                card = cardManager.fetch.drop("weekly");
                break;

            case "seasonal":
                dropEmbedTitle = "seasonal"; dropCooldownType = "drop_seasonal";
                card = cardManager.fetch.drop("seasonal");
                break;

            case "event": // TODO: use bot config for dynamic event name
                if (botSettings.currentEvent === "none" || botSettings.currentEvent === "")
                    return await interaction.editReply({ content: "There isn't an event right now." });

                dropEmbedTitle = botSettings.currentEvent; dropCooldownType = "drop_event";
                card = cardManager.fetch.drop("event");
                break;
        }

        // Check if the user has an active cooldown
        let cooldownETA_drop = dateTools.eta(userData.cooldowns.get(dropCooldownType), true);
        if (cooldownETA_drop) return await interaction.editReply({
            content: `You can drop again **${cooldownETA_drop}**.`
        });

        // Set the user's cooldown
        userData.cooldowns.set(dropCooldownType, dateTools.fromNow(userSettings.cooldowns[dropCooldownType]));

        // Add the card to the user's inventory
        await userManager.cards.add(interaction.user.id, card, true);

        let embed_drop = generalDrop_ES(interaction.user, card, dropEmbedTitle);

        return await interaction.editReply({ embeds: [embed_drop] });
    }
};