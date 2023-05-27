const { Client, CommandInteraction, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const { botSettings: { currencyIcon, customEmojis } } = require('../configs/heejinSettings.json');
const { BetterEmbed } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');
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

        /// Add the cards to the user's card_inventory (can cause UIDs to be reset)
        await userManager.cards.add(interaction.user.id, cards_dropped);

        /// Add details to embed_drop
        let cards_dropped_f = cards_dropped.map(card => cardManager.toString.inventory(card, { simplify: true }));

        // Add a number emoji infront of the card info if there's more than 1 card
        if (cards_dropped_f.length > 1) cards_dropped_f = cards_dropped_f.map((str, idx) =>
            `${customEmojis.numbers[idx].emoji} ${str}`
        );

        // Get the last card in the array
        let cards_dropped_last = cards_dropped.slice(-1)[0] || cards_dropped[0];

        embed_drop.setDescription(cards_dropped_f.join("\n"));
        embed_drop.setImage(cards_dropped_last.imageURL);

        /// Add buttons to embed_drop
        let actionRow_buttons = [
            new ButtonBuilder().setCustomId("btn_sell").setEmoji(currencyIcon).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("btn_vault").setEmoji("🔒").setStyle(ButtonStyle.Secondary)
        ];

        let actionRow = new ActionRowBuilder().addComponents(actionRow_buttons);

        // Send the drop embed
        await embed_drop.send({ components: actionRow });
    }
};