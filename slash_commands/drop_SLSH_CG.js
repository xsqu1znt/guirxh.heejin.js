const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings, userSettings, eventSettings } = require('../configs/heejinSettings.json');
const { dateTools, randomTools } = require('../modules/jsTools');
const { userDrop_ES } = require('../modules/embedStyles');
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
                cards = [...Array(5)].map(() => cardManager.get.drop("drop_5"));
                break;

            case "weekly":
                dropEmbedTitle = "weekly"; dropCooldownType = "drop_weekly";
                cards = [cardManager.get.drop("weekly")];
                break;

            case "seasonal":
                if (eventSettings.season.name === "none" || eventSettings.season.name === "")
                    return await embedinator.send("There isn't a season event right now.");

                dropEmbedTitle = "seasonal"; dropCooldownType = "drop_seasonal";
                cards = [cardManager.get.drop("seasonal")];
                break;

            case "event":
                if (eventSettings.name === "none" || eventSettings.name === "")
                    return await embedinator.send("There isn't an event right now.");

                dropEmbedTitle = "event"; dropCooldownType = "drop_event";
                cards = [cardManager.get.drop("event")];
                break;
        }

        // Check if the user has an active cooldown
        let cooldownETA_drop = dateTools.eta(userData.cooldowns.get(dropCooldownType), true);
        if (cooldownETA_drop) return await embedinator.send(
            `You can drop again **${cooldownETA_drop}**.`
        );

        // Set the user's cooldown and XP
        let { xp: { commands: { drop: xp_drop } } } = userSettings;
        userData.cooldowns.set(dropCooldownType, dateTools.fromNow(userSettings.cooldowns[dropCooldownType]));

        // Update the user in Mongo
        await userManager.update(interaction.user.id, {
            xp: userData.xp += randomTools.number(xp_drop.min, xp_drop.max),
            cooldowns: userData.cooldowns
        });

        // Add the card to the user's inventory
        await userManager.cards.add(interaction.user.id, cards, true);

        // Refresh userData for the purpose of checking if it's a duplicate card
        userData = await userManager.fetch(interaction.user.id, "cards");

        // Used to tell the user if a card they got is a duplicate
        let cards_isDuplicate = cards.map(card =>
            userParser.cards.duplicates(userData.card_inventory, { globalID: card.globalID }).card_duplicates.length > 1
        );

        // Create the embed
        let embed_drop = userDrop_ES(interaction.user, cards, cards_isDuplicate, dropEmbedTitle);

        // Send the drop embed
        await interaction.editReply({ embeds: [embed_drop] });

        // Add reactions to sell
        if (cards.length > 1) {
            let reply = await interaction.fetchReply();

            // Add reactions
            for (let i = 0; i < cards.length; i++)
                await reply.react(botSettings.customEmojis.number[i]);

            // Add the sell reaction
            await reply.react("✅");
        }
    }
};