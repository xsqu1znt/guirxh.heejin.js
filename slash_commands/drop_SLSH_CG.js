const { Client, CommandInteraction, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const { botSettings, userSettings, eventSettings } = require('../configs/heejinSettings.json');
const { dateTools, randomTools } = require('../modules/jsTools');
const { userDrop_ES } = require('../modules/embedStyles');
const { messageTools } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');
const cardManager = require('../modules/cardManager');
const userParser = require('../modules/userParser');

const { numbers: emoji_numbers, confirmSell: emoji_confirmSell } = botSettings.customEmojis;

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
        let reply = await interaction.editReply({ embeds: [embed_drop] });

        //* End here if there was only 1 card dropped
        if (cards.length === 1) return reply;

        // Refresh userData so we can access the user's balance
        userData = await userManager.fetch(interaction.user.id, "essential");

        // Create an array, the card the user wants to sell will be inserted at the relative index
        let sellableCards = cards.map(() => null);

        // Create an array of reaction emojis
        let reactionEmojis = [...emoji_numbers.slice(0, cards.length), emoji_confirmSell];

        // Create the reaction collector
        let filter_RC = (reaction, user) =>
            reactionEmojis.map(emoji => emoji.name).includes(reaction.emoji.name)
            && user.id === interaction.user.id;

        let collector_RC = reply.createReactionCollector({ filter: filter_RC, time: 30000, dispose: true });

        collector_RC.on("collect", async reaction => {
            // Reset the reaction collector's timer
            collector_RC.resetTimer();

            let reactionIndex = emoji_numbers.findIndex(e => e.name === reaction.emoji.name);

            if (reactionIndex >= 0) {
                if (!sellableCards.find(c => c?.uid === cards[reactionIndex].uid))
                    sellableCards[reactionIndex] = cards[reactionIndex];

                return;
            }

            sellableCards = sellableCards.filter(c => c);
            let sellTotal = sellableCards.length;
            let sellConfirm = await messageTools.awaitConfirmation(interaction, {
                // title: "Please confirm this action",
                description: `Are you sure you want to sell \`${sellTotal}\` ${sellTotal === 1 ? "card" : "cards"}?`,
                showAuthor: true
            });

            if (sellConfirm) {
                await userManager.cards.remove(interaction.user.id, sellableCards.map(c => c.uid));

                // Add to the user's balance
                let sellBalance = 0; sellableCards.forEach(card => sellBalance += card.sellPrice);
                await userManager.update(interaction.user.id, { balance: userData.balance + sellBalance });

                let { embed } = new messageTools.Embedinator(null, {
                    title: "%USER | sell",
                    description: "You sold cards:\n%CARDS"
                        .replace("%CARDS", sellableCards.map(card => `> ${cardManager.toString.basic(card)}`).join("\n")),
                    author: interaction.user,
                });

                await interaction.followUp({ embeds: [embed] });

                return await reply.reactions.removeAll();
            }
        });

        collector_RC.on("remove", async reaction => {
            collector_RC.resetTimer();

            let reactionIndex = emoji_numbers.findIndex(e => e.name === reaction.emoji.name);

            if (reactionIndex >= 0) {
                if (sellableCards.find(c => c?.uid === cards[reactionIndex].uid))
                    sellableCards[reactionIndex] = null;
            }
        });

        // Remove all reaction when the reaction collector times out or ends
        collector_RC.on("end", async () => await reply.reactions.removeAll());

        // Add the appropriate index/confirm emoji reactions
        for (let { emoji } of reactionEmojis) await reply.react(emoji);
    }
};