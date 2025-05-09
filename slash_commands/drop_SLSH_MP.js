const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

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

        .addStringOption(option => option.setName("card")
            .setDescription("Pick a type of drop")

            .addChoices(
                { name: "🃏 general", value: "general" },
                { name: "📅 weekly", value: "weekly" },
                { name: "🍃 season", value: "season" },
                { name: "🎆 event 1", value: "event_1" },
                { name: "🎆 event 2", value: "event_2" }
            )
            .setRequired(true)
        ),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let embed_drop = new messageTools.Embedinator(interaction, {
            title: "%USER | drop", author: interaction.user
        });

        let userData = await userManager.fetch(interaction.user.id, "full");
        let [dropEmbedTitle, dropCooldownType] = "";
        let cardsDropped = null;

        switch (interaction.options.getString("card")) {
            case "general":
                dropEmbedTitle = "drop"; dropCooldownType = "drop_general";
                cardsDropped = [...Array(5)].map(() => cardManager.get.drop("general"));
                break;

            case "weekly":
                dropEmbedTitle = "weekly"; dropCooldownType = "drop_weekly";
                cardsDropped = [cardManager.get.drop("weekly")];
                break;

            case "season":
                if (eventSettings.season.name === "none" || eventSettings.season.name === "")
                    return await embed_drop.send("There is no \`season\` right now");

                dropEmbedTitle = "season"; dropCooldownType = "drop_season";
                cardsDropped = [cardManager.get.drop("season")];
                break;

            case "event_1":
                if (eventSettings.event1.name === "none" || eventSettings.event1.name === "")
                    return await embed_drop.send("There is no \`event 1\` right now");

                dropEmbedTitle = "event 1"; dropCooldownType = "drop_event_1";
                cardsDropped = [cardManager.get.drop("event_1")];
                break;

            case "event_2":
                if (eventSettings.event2.name === "none" || eventSettings.event2.name === "")
                    return await embed_drop.send("There is no \`event 2\` right now");

                dropEmbedTitle = "event 2"; dropCooldownType = "drop_event_2";
                cardsDropped = [cardManager.get.drop("event_2")];
                break;
        }

        // Check if the user has an active cooldown
        let userCooldownETA = await userManager.cooldowns.check(interaction.user.id, dropCooldownType);
        if (userCooldownETA) return embed_drop.send(`Your next drop is available **${userCooldownETA}**`);

        // Update the user in Mongo
        let { xp: { commands: { drop: xp_drop } } } = userSettings;
        await userManager.update(interaction.user.id, {
            xp: userData.xp + randomTools.number(xp_drop.min, xp_drop.max)
        });

        // Reset the user's cooldown
        await userManager.cooldowns.reset(interaction.user.id, dropCooldownType);

        // Reset the user's reminder
        await userManager.reminders.reset(
            interaction.user.id, interaction.guild.id, interaction.channel.id,
            interaction.user, dropCooldownType
        );

        // Add the cards to the user's inventory
        cardsDropped = await userManager.cards.add(interaction.user.id, cardsDropped, true);

        // Refresh userData for the purpose of checking if it's a duplicate card
        // userData = await userManager.fetch(interaction.user.id, "cards", true);

        // Used to tell the user if a card they got is a duplicate
        let cards_isDuplicate = cardsDropped.map(card =>
            userParser.cards.duplicates([...userData.card_inventory, ...cardsDropped],
                { globalID: card.globalID }).cards.length > 1
        );

        // Create the embed
        embed_drop = userDrop_ES(interaction.user, cardsDropped, cards_isDuplicate, dropEmbedTitle);

        // Send the drop embed
        let reply = await interaction.editReply({ embeds: [embed_drop] });

        // Create an array, the card the user wants to sell will be inserted at the relative index
        let cards_toSell = cardsDropped.map(() => null);

        // Create an array of reaction emojis
        let reactionEmojis = [...emoji_numbers.slice(0, cardsDropped.length), emoji_confirmSell];
        // Only leave the confirm sell emoji if there was only 1 card dropped
        if (cardsDropped.length === 1) reactionEmojis = [emoji_confirmSell];

        // Create the reaction collector
        let filter_RC = (reaction, user) =>
            reactionEmojis.map(emoji => emoji.name).includes(reaction.emoji.name)
            && user.id === interaction.user.id;

        let collector_RC = reply.createReactionCollector({
            filter: filter_RC,
            time: dateTools.parseStr(botSettings.timeout.reactionSell),
            dispose: true
        });

        // When the user clicks on a reaction
        collector_RC.on("collect", async reaction => {
            // Reset the reaction collector's timer
            collector_RC.resetTimer();

            // Check if the user reacted to a card number
            let cardIndex = emoji_numbers.findIndex(emoji => emoji.name === reaction.emoji.name);
            if (cardIndex !== -1) {
                // Insert the card at the appropriate index
                // avoiding adding the same card twice
                if (!cards_toSell.find(card => card?.uid === cardsDropped[cardIndex].uid))
                    cards_toSell[cardIndex] = cardsDropped[cardIndex];

                // Ends the function regardless
                return;
            }

            //* Ask the user to confirm if they want to sell
            // Remove the null slots from the array since we don't need them anymore
            cards_toSell = cardsDropped.length > 1 ? cards_toSell.filter(card => card) : cardsDropped;

            // Only send the confirmation if the user actually selected cards
            if (cards_toSell.length === 0) {
                // Let the user know they need to select something to sell
                let { embed: embed_error } = new messageTools.Embedinator(null, {
                    title: "%USER | sell",
                    description: "Use the reactions to pick what you want to sell",
                    author: interaction.user
                });

                // Let the user know the result
                messageTools.deleteAfter(
                    await interaction.followUp({ embeds: [embed_error] }),
                    dateTools.parseStr(botSettings.timeout.errorMessage)
                );

                return;
            }

            // Parse cards_toSell into a human readable string array
            let cards_toSell_f = cards_toSell.map(card => `> ${cardManager.toString.basic(card)}`);
            let sellPriceTotal = 0; cards_toSell.forEach(card => sellPriceTotal += card.sellPrice);

            // Await the user's confirmation
            let confirm_sell = await messageTools.awaitConfirmation(interaction, {
                description: "**Are you sure you want to sell:**\n%CARDS"
                    .replace("%CARDS", cards_toSell_f.join("\n")),
                footer: `total: ${botSettings.currencyIcon} ${sellPriceTotal}`,
                showAuthor: true
            });

            // Sell the cards
            if (confirm_sell) {
                await userManager.cards.sell(interaction.user.id, cards_toSell);

                // Let the user know the result
                let { embed: embed_sell } = new messageTools.Embedinator(null, {
                    title: "%USER | sell",
                    description: "You sold:\n%CARDS"
                        .replace("%CARDS", cards_toSell_f.join("\n")),
                    footer: `total: ${botSettings.currencyIcon} ${sellPriceTotal}`,
                    author: interaction.user
                });

                // Let the user know the result
                await interaction.followUp({ embeds: [embed_sell] }); return collector_RC.stop();
            }
        });

        collector_RC.on("remove", async reaction => {
            // Reset the reaction collector's timer
            collector_RC.resetTimer();

            // Check if the user reacted to a card number
            let cardIndex = emoji_numbers.findIndex(emoji => emoji.name === reaction.emoji.name);

            // Insert a null at the appropriate index
            if (cardIndex !== -1) cards_toSell[cardIndex] = null;
        });

        // Remove all reactions when the reaction collector times out or ends
        collector_RC.on("end", async () => { try { await reply.reactions.removeAll() } catch { } });

        // Add the appropriate index/confirm emoji reactions
        // function ends without awaiting completion
        (async () => { for (let { emoji } of reactionEmojis) await reply.react(emoji); })();
    }
};