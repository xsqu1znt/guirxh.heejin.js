/** @file Executed as soon as the bot's connected to Discord @author xsqu1znt */

const { Client } = require("discord.js");
const { userManager, questManager } = require("../../modules/mongo");
const logger = require("../../modules/logger");
const jt = require("../../modules/jsTools");

const config = { bot: require("../../configs/config_bot.json") };

module.exports = {
	name: "BOT_READY",
	event: "ready",

	/** @param {Client} client  */
	execute: async client => {
		const doTheThing = async () => {
			// Update the active quest array
			questManager.updateActiveQuests();

			if (!questManager.quests_active().length) {
				// Delete every user quest cache that exists
				await userManager.models.userQuestData.deleteMany({}).catch(() => {});
			}
		};

		if (config.bot.PARSE_QUESTS_INTERVAL_ENABLED)
			setInterval(doTheThing, jt.parseTime(config.bot.timeouts.PARSE_QUESTS_INTERVAL));
	}
};
