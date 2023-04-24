const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings, userSettings } = require('../configs/heejinSettings.json');
const { dateTools } = require('../modules/jsTools');
const { generalDrop_ES } = require('../modules/embedStyles');
const { messageTools } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');
const cardManager = require('../modules/cardManager');
const userParser = require('../modules/userParser');

module.exports = {
    builder: new SlashCommandBuilder().setName("drop")
        .setDescription("Drop a random card")

        .addSubcommand(subcommand => subcommand
            .setName("5")
            .setDescription("Get 5 random cards of any rarity"))

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
        // Reusable embedinator to send success/error messages
        const embedinator = new messageTools.Embedinator(interaction, {
            title: "%USER | drop", author: interaction.user
        });

        let userData = await userManager.fetch(interaction.user.id, "essential");
        let [dropEmbedTitle, dropCooldownType] = "";
        let cards;

        switch (interaction.options.getSubcommand()) {
            case "5":
                dropEmbedTitle = "drop 5"; dropCooldownType = "drop_5";
                cards = [...Array(5)].map(() => cardManager.fetch.drop("drop_5"));
                break;

            case "weekly":
                dropEmbedTitle = "weekly"; dropCooldownType = "drop_weekly";
                cards = cardManager.fetch.drop("weekly");
                break;

            case "seasonal":
                dropEmbedTitle = "seasonal"; dropCooldownType = "drop_seasonal";
                cards = cardManager.fetch.drop("seasonal");
                break;

            case "event": // TODO: use bot config for dynamic event name
                if (botSettings.currentEvent === "none" || botSettings.currentEvent === "")
                    return await embedinator.send("There isn't an event right now.");

                dropEmbedTitle = botSettings.currentEvent; dropCooldownType = "drop_event";
                cards = cardManager.fetch.drop("event");
                break;
        }

        // Check if the user has an active cooldown
        let cooldownETA_drop = dateTools.eta(userData.cooldowns.get(dropCooldownType), true);
        if (cooldownETA_drop) return await embedinator.send(
            `You can drop again **${cooldownETA_drop}**.`
        );

        // Set the user's cooldown
        userData.cooldowns.set(dropCooldownType, dateTools.fromNow(userSettings.cooldowns[dropCooldownType]));
        // await userManager.update(interaction.user.id, { cooldowns: userData.cooldowns });

        // Add the card to the user's inventory
        await userManager.cards.add(interaction.user.id, cards, true);

        // Refresh userData for the purpose of checking if it's a duplicate card
        userData = await userManager.fetch(interaction.user.id, "cards");

        // Used to tell the user if a card they got is a duplicate
        let cards_isDuplicate = cards.map(card =>
            userParser.cards.duplicates(userData.card_inventory, { globalID: card.globalID }).length > 1
        );

        let embed_drop = generalDrop_ES(interaction.user, cards, cards_isDuplicate, dropEmbedTitle);

        return await interaction.editReply({ embeds: [embed_drop] });
    }
};