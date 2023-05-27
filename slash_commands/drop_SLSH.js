const {
    Client, CommandInteraction, SlashCommandBuilder, ComponentType,
    ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');

const { botSettings: { currencyIcon, customEmojis, timeout } } = require('../configs/heejinSettings.json');
const { BetterEmbed, messageTools } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');
const { dateTools } = require('../modules/jsTools');
const cardManager = require('../modules/cardManager');

module.exports = {
    builder: new SlashCommandBuilder().setName("drop")
        .setDescription("Drop a random card")

        .addStringOption(option => option.setName("card")
            .setDescription("Pick a type of drop")

            .addChoices(
                { name: "🃏 general", value: "general" },
                { name: "📅 weekly", value: "weekly" },
                { name: "🍃 season", value: "season" },
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
            author: { text: `%AUTHOR_NAME | ${commandAddon}`, user: interaction.member }
        });

        // Create an embed reference
        let embed_drop = embed_template();

        /// Get the drop cards
        let cards_dropped = [];

        switch (interaction.options.getString("card")) {
            case "general":
                embed_drop = embed_template("drop");
                cards_dropped = cardManager.drop("general", 5); break;

            case "weekly":
                embed_drop = embed_template("weekly");
                cards_dropped = cardManager.drop("weekly", 1); break;

            case "season":
                embed_drop = embed_template("season");
                cards_dropped = cardManager.drop("season", 1); break;

            case "event1":
                embed_drop = embed_template("event 1");
                cards_dropped = cardManager.drop("event1", 1); break;

            case "event2":
                embed_drop = embed_template("event 2");
                cards_dropped = cardManager.drop("event2", 1); break;
        }

        // Add the cards to the user's card_inventory (can cause UIDs to be reset)
        // await userManager.cards.add(interaction.user.id, cards_dropped);

        // Add details to embed_drop
        let cards_dropped_f = cards_dropped.map(card => cardManager.toString.inventory(card, { simplify: true }));

        // Add a number emoji infront of the card info if there's more than 1 card
        if (cards_dropped_f.length > 1) cards_dropped_f = cards_dropped_f.map((str, idx) =>
            `${customEmojis.numbers[idx].emoji} ${str}`
        );

        // Get the last card in the array
        let cards_dropped_last = cards_dropped.slice(-1)[0] || cards_dropped[0];

        embed_drop.setDescription(cards_dropped_f.join("\n"));
        embed_drop.setImage(cards_dropped_last.imageURL);

        // Send the drop embed
        let message = await embed_drop.send();

        //! Separate embeds
        let embed_nothingSelected = new BetterEmbed({
            interaction, author: { text: "%AUTHOR_NAME | sell", user: interaction.member },
            description: "Use the reactions to select what you want to sell"
        });

        //! Collect reactions
        // Create an array to hold which cards the user wants to sell
        let cards_toSell = cards_dropped.map(() => null);

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
            reactionEmojis.map(emoji => emoji.name).includes(reaction.emoji.name)
            && user.id === interaction.user.id;

        let rc_collector = message.createReactionCollector({
            filter: rc_filter, dispose: true,
            time: dateTools.parseStr(timeout.reactionSell)
        });

        // Select a card to sell, or confirm the sell
        rc_collector.on("collect", async reaction => {
            // Reset the collector's timer
            rc_collector.resetTimer();

            // Ignore user added reactions
            if (![...reactionEmojis.map(e => e.name), customEmojis.confirmSell.name].includes(reaction.emoji.name)) return;
            // Check if the user reacted to a card number
            let card_idx = reactionEmojis.findIndex(emoji => emoji.name === reaction.emoji.name);
            if (card_idx !== -1) {
                // Insert the card at the appropriate index
                // avoiding adding the same card twice
                if (!cards_toSell.find(card => card?.uid === cards_dropped[card_idx].uid))
                    cards_toSell[card_idx] = cards_dropped[card_idx].uid;
                return;
            }

            // Remove the sell reactions
            await removeReactions();

            // Check that there's cards selected
            if (!cards_toSell.filter(c => c).length) {
                await messageTools.deleteAfter(
                    await embed_nothingSelected.send({ method: "followUp" }),
                    dateTools.parseStr(timeout.errorMessage)
                );

                return await addReactions();
            }
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
    }
};