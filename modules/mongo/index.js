/* Connects us to our Mongo database so we can save and retrieve data. */

const logger = require("../logger");

const mongoose = require("mongoose");
const MONGO_URI = process.env.MONGO_URI || require("../../configs/config_client.json").MONGO_URI;

/// Custom Mongo modules
// const questManager = require("./questManager");
const userManager = require("./userManager");

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
	userManager
};
