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
        let card;

        switch (interaction.options.getSubcommand()) {
            case "1":
                // Check if the user has an active cooldown
                let cooldownETA_drop1 = dateTools.eta(userData.cooldowns.get("drop_1"), true);
                if (cooldownETA_drop1) return await interaction.editReply({
                    content: `You can drop again **${cooldownETA_drop1}**.`
                });

                dropEmbedTitle = "drop 1";
                card = cardManager.randomDrop("drop");

                // Set the user's cooldown
                userData.cooldowns.set("drop_1", dateTools.fromNow(userSettings.cooldowns.drop_1));
                break;

            case "2":
                // Check if the user has an active cooldown
                let cooldownETA_drop2 = dateTools.eta(userData.cooldowns.get("drop_2"), true);
                if (cooldownETA_drop2) return await interaction.editReply({
                    content: `You can drop again **${cooldownETA_drop2}**.`
                });

                dropEmbedTitle = "drop 2";
                card = cardManager.randomDrop("drop");

                // Set the user's cooldown
                userData.cooldowns.set("drop_2", dateTools.fromNow(userSettings.cooldowns.drop_2));
                break;

            case "3":
                // Check if the user has an active cooldown
                let cooldownETA_drop3 = dateTools.eta(userData.cooldowns.get("drop_3"), true);
                if (cooldownETA_drop3) return await interaction.editReply({
                    content: `You can drop again **${cooldownETA_drop3}**.`
                });

                dropEmbedTitle = "drop 3";
                card = cardManager.randomDrop("drop_3_4");

                // Set the user's cooldown
                userData.cooldowns.set("drop_3", dateTools.fromNow(userSettings.cooldowns.drop_3));
                break;

            case "4":
                // Check if the user has an active cooldown
                let cooldownETA_drop4 = dateTools.eta(userData.cooldowns.get("drop_4"), true);
                if (cooldownETA_drop4) return await interaction.editReply({
                    content: `You can drop again **${cooldownETA_drop4}**.`
                });

                dropEmbedTitle = "drop 4";
                card = cardManager.randomDrop("drop_3_4");

                // Set the user's cooldown
                userData.cooldowns.set("drop_4", dateTools.fromNow(userSettings.cooldowns.drop_4));
                break;

            case "weekly":
                // Check if the user has an active cooldown
                let cooldownETA_dropWeekly = dateTools.eta(userData.cooldowns.get("drop_weekly"), true);
                if (cooldownETA_dropWeekly) return await interaction.editReply({
                    content: `You can drop again **${cooldownETA_dropWeekly}**.`
                });

                dropEmbedTitle = "weekly";
                card = cardManager.randomDrop("weekly");

                // Set the user's cooldown
                userData.cooldowns.set("weekly", dateTools.fromNow(userSettings.cooldowns.drop_weekly));
                break;

            case "seasonal":
                // Check if the user has an active cooldown
                let cooldownETA_dropSeasonal = dateTools.eta(userData.cooldowns.get("drop_seasonal"), true);
                if (cooldownETA_dropSeasonal) return await interaction.editReply({
                    content: `You can drop again **${cooldownETA_dropSeasonal}**.`
                });

                dropEmbedTitle = "seasonal";
                card = cardManager.randomDrop("seasonal");

                // Set the user's cooldown
                userData.cooldowns.set("seasonal", dateTools.fromNow(userSettings.cooldowns.drop_seasonal));
                break;

            case "event": // TODO: use bot config for dynamic event name
                // Check if the user has an active cooldown
                let cooldownETA_dropEvent = dateTools.eta(userData.cooldowns.get("drop_event"), true);
                if (cooldownETA_dropEvent) return await interaction.editReply({
                    content: `You can drop again **${cooldownETA_dropEvent}**.`
                });

                dropEmbedTitle = "event"
                card = cardManager.randomDrop("event");

                // Set the user's cooldown
                userData.cooldowns.set("drop_event", dateTools.fromNow(userSettings.cooldowns.drop_event));
                break;
        }

        // Add a unique ID to the card
        card.uid = randomTools.numberString(6);

        let embed_drop = generalDrop_ES(interaction.user, card, dropEmbedTitle);

        return await interaction.editReply({ embeds: [embed_drop] });
    }
};