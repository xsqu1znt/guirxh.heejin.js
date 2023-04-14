const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { randomTools } = require('../modules/jsTools');
const { generalDrop_ES } = require('../modules/embedStyles');

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
        let card;
        let dropEmbedTitle = "";

        switch (interaction.options.getSubcommand()) {
            case "1":
                dropEmbedTitle = "drop 1"
                break;
                
            case "2":
                dropEmbedTitle = "drop 2"
                break;
                
            case "3":
                dropEmbedTitle = "drop 3"
                break;
                
            case "4":
                dropEmbedTitle = "drop 4"
                break;
                
            case "weekly":
                dropEmbedTitle = "weekly"
                break;
                
            case "seasonal":
                dropEmbedTitle = "seasonal"
                break;
                
            case "event": // TODO: use bot config for dynamic event name
                dropEmbedTitle = "event"
                break;
                
        }

        let embed_drop = generalDrop_ES(interaction.user, card, dropEmbedTitle);

        return await interaction.reply({ embeds: [embed_drop] });
    }
};