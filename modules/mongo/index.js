/* Connects us to our Mongo database so we can save and retrieve data. */

const logger = require("../logger");

const mongoose = require("mongoose");
const MONGO_URI = process.env.MONGO_URI || require("../../configs/config_client.json").MONGO_URI;

/// Custom Mongo modules
// const questManager = require("./questManager");

const userManager = {
	index: require("./uM_index"),
	levels: require("./uM_levels"),
	balance: require("./uM_balance"),
	inventory: require("./uM_inventory"),
	badges: require("./uM_badges"),
	charms: require("./uM_charms"),
	cooldowns: require("./uM_cooldowns"),
	reminders: require("./uM_reminders"),
	quests: require("./uM_quests"),
	statistics: require("./uM_statistics")
};

module.exports = {
	/** Connect to MongoDB */
	connect: async (uri = MONGO_URI) => {
		// Try to connect to MongoDB
		let connection = await new Promise((resolve, reject) => {
			return mongoose
				.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
				.then(() => resolve(true))
				.catch(err => reject(err));
		});

		// Log the success if successful
		if (connection) return logger.success("Successfully connected to MongoDB");

		// Log the error if unsuccessful
		logger.error("Failed to connect to MongoDB", null, connection);
	},

	// questManager,
	userManager: {
		...userManager.index,
		levels: userManager.levels,
		balance: userManager.balance,
		inventory: userManager.inventory,
		badges: userManager.badges,
		charms: userManager.charms,
		cooldowns: userManager.cooldowns,
		reminders: userManager.reminders,
		quests: userManager.quests,
		statistics: userManager.statistics
	}
};
