const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools/_dsT");
const { error_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");
const _jsT = require("../modules/jsTools/_jsT");
const Stage = require("../modules/stage_OLD");

const config = {
	player: require("../configs/config_player.json"),
	bot: require("../configs/config_bot.json")
};

module.exports = {
	options: { icon: "🎤", deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("stage")
        .setDescription("LV. your idol by challenging a rival to a duel"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let rival = interaction.user || null;

		/* - - - - - - - - - - { COOLDOWNS } - - - - - - - - - - */
		/// Check if the user has an active cooldown :: { STAGE }
		let cooldown_stage_user = await userManager.cooldowns.check(interaction.user.id, "stage");
		// prettier-ignore
		if (cooldown_stage_user) return await cooldown_ES.send({
            interaction, description: `Your stage will be ready **${cooldown_stage_user}**`
		});

		/* - - - - - - - - - - { USER STARTED } - - - - - - - - - - */
		// prettier-ignore
		// A player can't duel themself
		if (rival?.id === interaction.user.id) return await error_ES.send({
			interaction, description: "You cannot duel yourself, silly!"
		});

		// prettier-ignore
		// Check if the rival player started
		if (!(await userManager.exists(rival?.id))) return await error_ES.send({
			interaction, description: `${rival} has not started yet`
		});

		/* - - - - - - - - - - { COOLDOWNS } - - - - - - - - - - */
		/// Check if the rival has an active cooldown :: { STAGE }
		let cooldown_stage_rival = await userManager.cooldowns.check(rival.id, "stage");
		// prettier-ignore
		if (cooldown_stage_rival) return await cooldown_ES.send({
            interaction, description: `Your stage will be ready **${cooldown_stage_rival}**`
		});

		/* - - - - - - - - - - { USERDATA } - - - - - - - - - - */
		// Fetch the user & rival from Mongo :: { RIVAL }
		let userData = {
			user: await userManager.fetch(interaction.user.id, { type: "essential" }),
			rival: await userManager.fetch(rival?.id, { type: "essential" })
		};

		/// Get the player's idol from their card_inventory
		let card_idol = {
			user: await userManager.inventory.get(interaction.user.id, { uids: userData.user.card_selected_uid }),
			rival: await userManager.inventory.get(rival?.id, { uids: userData.rival?.card_selected_uid })
		};

		/* - - - - - - - - - - { USER IDOL } - - - - - - - - - - */
		// prettier-ignore
		if (!card_idol.user) return await error_ES.send({
			interaction, description: "You do not have an `🏃 idol` set\nUse `/set` `edit:🏃 idol` `add:UID`"
		});
		// prettier-ignore
		if (!card_idol.rival && rival) return await error_ES.send({
			interaction, description: `${rival} does not have an \`🏃 idol\` set\nUse \`/set\` \`edit:🏃 idol\` \`add:UID\``
		});

		// Assign a random card as the rival idol if the user didn't choose to battle a player
		if (!rival) card_idol.rival = cardManager.get.random({ basic: true, lvl_min: 0, lvl_max: 100 });

		/* - - - - - - - - - - { COOLDOWNS } - - - - - - - - - - */
		// Set the user's cooldown & reminder
		await Promise.all([
			userManager.cooldowns.set(interaction.user.id, "stage"),
			userManager.reminders.set(interaction.user.id, "stage")
		]);

		// prettier-ignore
		// Set the rival's cooldown & reminder
		if (rival) await Promise.all([
			userManager.cooldowns.set(rival.id, "stage"),
			userManager.reminders.set(rival.id, "stage")
		]);

		/* - - - - - - - - - - { STAGE } - - - - - - - - - - */
		// Create the Stage instance
		let stage = new Stage({
			interaction,
			opponents: { user: interaction.user, rival },
			idol: { user: card_idol.user, rival: card_idol.rival }
		});

		// Send the stage embed
		await stage.embed.send();

		// Await the winning opponent
		let stage_winner = await stage.start();

		if (stage_winner.isUser) {
			await Promise.all([
				userManager.inventory.update(stage_winner.id, stage_winner.idol.card),
				userManager.xp.increment(stage_winner.id, stage_winner.xp)
			]);

			// prettier-ignore
			return await stage.embed.send({
				footer: "$WINNER's idol gained ☝️ $XPXP %LEVEL_UP"
					.replace("$WINNER", stage_winner.user.username)
					.replace("$XP", stage_winner.idol.xp)
					.replace("$LEVEL_UP", stage_winner.idol.levels
						? `and gained \`${stage_winner.idol.levels}\` ${stage_winner.idol.levels === 1 ? "level" : "levels"}`
						: ""
					)
			});
		}

		// If the user lost and didn't choose a rival
		return await stage.embed.send({ footer: "You lost... Try again next time!" });
	}
};
