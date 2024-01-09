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
		let add = interaction.options.getString("add") || null;
		let remove = interaction.options.getString("remove") || null;

		// prettier-ignore
		if (!add && !remove) return await error_ES.send({
            interaction, description: "You must provide at least 1 UID in either `add` or `remove`",
            ephemeral: true
        });

		/// Put the chosen UID(s) into proper variables
		let uid = add ? add : remove;
		let uids = uids.split(",") || [];

		// Determine the operation
		let operation = add ? "add" : "remove";

		// Defer the interaction
		await interaction.deferReply().catch(() => null);

		// Execute the operation
		switch (interaction.options.getString("edit")) {
			// prettier-ignore
			case "favorite": switch (operation) {
                case "add": return await subcommand_favorite_add(interaction, uid);
                case "remove": return await subcommand_favorite_remove(interaction, uid);
            }

			// prettier-ignore
			case "idol": switch (operation) {
                case "add": return await subcommand_idol_add(interaction, uid);
                case "remove": return await subcommand_idol_remove(interaction, uid);
            }

			// prettier-ignore
			case "vault": switch (operation) {
                case "add": return await subcommand_vault_add(interaction, uids);
                case "remove": return await subcommand_vault_remove(interaction, uids);
            }

			// prettier-ignore
			case "team": switch (operation) {
                case "add": return await subcommand_team_add(interaction, uids);
                case "remove": return await subcommand_team_remove(interaction, uids);
            }
		}
	}
};
