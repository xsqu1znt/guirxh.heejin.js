const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const {
    botSettings: { currencyIcon, customEmojis, timeout },
    eventSettings: { event1, event2, season },
    userSettings: { xp: { commands: { drop: xp_drop } } }
} = require('../configs/heejinSettings.json');

const { BetterEmbed, awaitConfirmation, deleteMesssageAfter } = require('../modules/discordTools');
const { userManager: userManager_OLD } = require('../modules/mongo');
const { randomTools, dateTools } = require('../modules/jsTools');
const { userManager } = require('../modules/mongo/index');
const cardManager = require('../modules/cardManager');
const userParser = require('../modules/userParser');

module.exports = {
    options: { icon: "💧", deferReply: true },

    builder: new SlashCommandBuilder().setName("drop")
        .setDescription("Drop a random card")

        .addStringOption(option => option.setName("card")
            .setDescription("Pick a type of drop")

            .addChoices(
                { name: "🃏 general", value: "general" },
                { name: "📅 weekly", value: "weekly" },
                { name: "☀️ season", value: "season" },
                { name: "🎆 event 1", value: "event1" },
                { name: "🎆 event 2", value: "event2" }
            )
            .setRequired(true)
        ),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Create an embed template
        let embed_template = (commandAddon = "", description = "", imageURL = "") => new BetterEmbed({
            interaction, description, imageURL,
            author: { text: `%AUTHOR_NAME | ${commandAddon || "drop"}`, user: interaction.member }
        });

        // Create an embed reference
        let embed_drop = embed_template();

        /// Get the drop cards
        let cards_dropped = [];
        let dropCooldownType = "";

        switch (interaction.options.getString("card")) {
            case "general":
                embed_drop = embed_template("drop");
                cards_dropped = cardManager.drop("general", 5);
                dropCooldownType = "drop_general"; break;

            case "weekly":
                embed_drop = embed_template("weekly");
                cards_dropped = cardManager.drop("weekly", 1);
                dropCooldownType = "drop_weekly"; break;

            case "season":
                if (season.name === "none" || season.name === "")
                    return await embed_drop.send({ description: "There is no \`season\` right now" });

                embed_drop = embed_template("season");
                cards_dropped = cardManager.drop("season", 1);
                dropCooldownType = "drop_season"; break;

            case "event1":
                if (event1.name === "none" || event1.name === "")
                    return await embed_drop.send({ description: "There is no \`event 1\` right now" });

                embed_drop = embed_template("event 1");
                cards_dropped = cardManager.drop("event1", 1);
                dropCooldownType = "drop_event_1"; break;

            case "event2":
                if (event2.name === "none" || event2.name === "")
                    return await embed_drop.send({ description: "There is no \`event 2\` right now" });

                embed_drop = embed_template("event 2");
                cards_dropped = cardManager.drop("event2", 1);
                dropCooldownType = "drop_event_2"; break;
        }

        // Check if the user has an active cooldown
        let userCooldownETA = await userManager_OLD.cooldowns.check(interaction.user.id, dropCooldownType);
        if (userCooldownETA) return await embed_drop.send({ description: `Your next drop is available **${userCooldownETA}**` });

        await Promise.all([
            // Add the cards to the user's card_inventory (can cause UIDs to be reset)
            userManager.inventory.add(interaction.user.id, cards_dropped),
            // Give the user XP
            userManager.xp.increment(interaction.user.id, randomTools.number(xp_drop.min, xp_drop.max)),
            // Reset the user's cooldown
            userManager_OLD.cooldowns.reset(interaction.user.id, dropCooldownType),
            // Reset the user's reminder
            userManager_OLD.reminders.reset(
                interaction.user.id, interaction.guild.id, interaction.channel.id,
                interaction.user, dropCooldownType
            )
        ]);

        //! Add details to embed_drop
        // Fetch the user's card_inventory from Mongo
        let userData = await userManager.fetch(interaction.user.id, "cards", true);

        let cards_dropped_f = cards_dropped.map(card => {
            let { duplicateCount } = userParser.cards.getDuplicates(userData, card.globalID);

            return cardManager.toString.inventory(card, { isDuplicate: (duplicateCount > 0), simplify: true });
        });

        // Add a number emoji infront of the card info if there's more than 1 card
        if (cards_dropped_f.length > 1) cards_dropped_f = cards_dropped_f.map((str, idx) =>
            `${customEmojis.numbers[idx].emoji} ${str}`
        );

        // Get the last card in the array
        let cards_dropped_last = cards_dropped.slice(-1)[0] || cards_dropped[0];

        embed_drop.setDescription(cards_dropped_f.join("\n"));
        embed_drop.setImage(cards_dropped_last.imageURL);
        embed_drop.setFooter({
            text: cards_dropped.length > 1
                ? "React with any number and confirm to sell"
                : "React to sell this card",
            iconURL: "https://cdn.discordapp.com/attachments/1014199645750186044/1104414979798618243/carrot.png"
        })

        // Send the drop embed
        let message = await embed_drop.send();

        //! Collect reactions
        let embed_nothingSelected = new BetterEmbed({
            interaction, author: { text: "%AUTHOR_NAME | sell", user: interaction.member },
            description: "Use the reactions to pick what you want to sell"
        });

        let embed_failedToSell = new BetterEmbed({
            interaction, author: { text: "%AUTHOR_NAME | sell", user: interaction.member },
            description: "Can not sell cards that are not in your inventory"
        });

        // Create an array to hold which cards the user wants to sell
        let cards_toSell = cards_dropped.length > 1 ? cards_dropped.map(() => null) : cards_dropped;

        // Create an array of reaction emojis
        let reactionEmojis = cards_dropped.length > 1 ? [...customEmojis.numbers.slice(0, cards_dropped.length)] : [];

        /// Add the reactions to the message
        let addReactions = async () => {
            try {
                for (let emoji of reactionEmojis) await message.react(emoji.emoji);
                await message.react(customEmojis.confirmSell.emoji);
            } catch { }
        };

        let removeReactions = async () => {
            try { await message.reactions.removeAll() } catch { }
        };

        addReactions();

        /// Create the reaction collector        
        let rc_filter = (reaction, user) =>
            [...reactionEmojis.map(emoji => emoji.name), customEmojis.confirmSell.name].includes(reaction.emoji.name)
            && user.id === interaction.user.id;

        let rc_collector = message.createReactionCollector({
            filter: rc_filter, dispose: true,
            time: dateTools.parseStr(timeout.reactionSell)
        });

        // Select a card to sell, or confirm the sell
        rc_collector.on("collect", async reaction => {
            // Reset the collector's timer
            rc_collector.resetTimer();

            // Check if the user reacted to a card number
            let card_idx = reactionEmojis.findIndex(emoji => emoji.name === reaction.emoji.name);
            if (card_idx !== -1) {
                // Insert the card at the appropriate index
                // avoiding adding the same card twice
                if (!cards_toSell.find(card => card?.uid === cards_dropped[card_idx].uid))
                    cards_toSell[card_idx] = cards_dropped[card_idx];
                return;
            }

            // Filter out the nulls
            cards_toSell = cards_toSell.filter(c => c);

            // Check that there's cards selected
            if (!cards_toSell.length) {
                // Remove the user's confirm reaction
                await reaction.users.remove(interaction.user.id);

                await deleteMesssageAfter(
                    await embed_nothingSelected.send({ method: "followUp" }),
                    timeout.errorMessage
                );

                // Reset the collector's timer
                rc_collector.resetTimer(); return;
            }

            // Remove the sell reactions
            await removeReactions();

            //! Sell the cards
            // Parse the cards into a string
            let cards_toSell_f = cards_toSell.map(card => `> ${cardManager.toString.basic(card)}`);
            let sellPriceTotal = 0; cards_toSell.forEach(card => sellPriceTotal += card.sellPrice);

            // Await the user's confirmation
            let confirm_sell = await awaitConfirmation({
                interaction, showAuthorIcon: true,
                description: `**Are you sure you want to sell:**\n${cards_toSell_f.join("\n")}`,
                footer_text: `total: ${currencyIcon} ${sellPriceTotal}`,
            });

            // Add back the reactions and reset the collector's timer
            if (!confirm_sell) {
                addReactions(); rc_collector.resetTimer();
                cards_toSell = cards_dropped.length > 1 ? cards_dropped.map(() => null) : cards_dropped;
                return;
            }

            // Remove the cards from the user's card_inventory and give them currency
            if (!await userManager.inventory.sell(interaction.user.id, cards_toSell))
                return await embed_failedToSell.send();

            // Let the user know the result
            return await new BetterEmbed({
                interaction, author: { text: "%AUTHOR_NAME | sell", user: interaction.member },
                description: `You sold:\n${cards_toSell_f.join("\n")}`,
                footer: { text: `total: ${currencyIcon} ${sellPriceTotal}` }
            }).send({ method: "followUp" });
        });

        // Deselect a card on reaction remove
        rc_collector.on("remove", async reaction => {
            // Reset the reaction collector's timer
            rc_collector.resetTimer();

            // Check if the user reacted to a card number
            let cardIndex = reactionEmojis.findIndex(emoji => emoji.name === reaction.emoji.name);

            // Insert a null at the appropriate index
            if (cardIndex !== -1) cards_toSell[cardIndex] = null;
        });

        // Remove all reactions when the reaction collector times out or ends
        rc_collector.on("end", async () => await removeReactions());

        // Return the reply message
        return message;
    }
};