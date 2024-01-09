const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools");
const { error_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");
const jt = require("../modules/jsTools");

const config = { player: require("../configs/config_player.json") };

async function subcommand_favorite_add(interaction, uid) {}

async function subcommand_favorite_remove(interaction, uid) {}

async function subcommand_idol_add(interaction, uid) {}
async function subcommand_idol_remove(interaction, uid) {}

async function subcommand_vault_add(interaction, uids) {}
async function subcommand_vault_remove(interaction, uids) {}

async function subcommand_team_add(interaction, uids) {}
async function subcommand_team_remove(interaction, uids) {}

module.exports = {
	options: { icon: "🏃", deferReply: false },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("set")
        .setDescription("Add/remove a card from something")

        .addStringOption(option => option.setName("edit").setDescription("Choose what you want to set")
            .setRequired(true)
            .addChoices(
                { name: "⭐ favorite", value: "favorite" },
                { name: "🏃 idol", value: "idol" },
                { name: "🔒 vault", value: "vault" },
                { name: "👯 team", value: "team" }
            )
        )

        .addStringOption(option => option.setName("add").setDescription("Add a card using its UID separate by comma"))
        .addStringOption(option => option.setName("remove").setDescription("Remove a card using its UID separate by comma")),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
        // Get interaction options
        let edit = interaction.options.getString("edit");
		let add = interaction.options.getString("add") || null;
		let remove = interaction.options.getString("remove") || null;

		// Split UIDs by commas
		let add_split = add ? add.split(",") : [];
		let remove_split = remove ? remove.split(",") : [];

		// prettier-ignore
		if (!add_split.length && !remove_split.length) return await error_ES.send({
            interaction, description: "You must provide at least 1 UID in either `add` or `remove`",
            ephemeral: true
        });

		// Determine the operation
		let operation = add_split.length ? "add" : "remove";

		// Defer the interaction
        await interaction.deferReply().catch(() => null);
        
        // Execute the operation
	}
};
