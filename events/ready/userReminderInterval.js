/** @file Executed as soon as the bot's connected to Discord */

const { Client } = require("discord.js");

const { BetterEmbed } = require("../../modules/discordTools");
const { userManager } = require("../../modules/mongo");
const jt = require("../../modules/jsTools");

const config = { bot: require("../../configs/config_bot.json") };

module.exports = {
	name: "USER_REMINDER_INTERVAL",
	event: "ready",

	/** @param {Client} client  */
	execute: async client => {
		const doTheThing = async () => {
			// Fetch the reminders of every user
			let userReminders = await userManager.fetch(null, { type: "reminder" });

			console.log(userReminders);
		};

		setInterval(doTheThing, jt.parseTime(config.bot.timeouts.USER_REMINDER_INTERVAL));
	}
};
