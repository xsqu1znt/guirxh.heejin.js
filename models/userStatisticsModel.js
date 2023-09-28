const { Schema, model } = require("mongoose");

const schema_userStatistics = new Schema(
	{
		_id: { type: String, require: true },

		commands: { used: Array },
		balance: { currency: Number, ribbons: Number },

		timestamp_started: { type: Number, require: true }
	},
	{ collection: "user_statistics" }
);

module.exports = { schema: schema_userStatistics, model: model("user_statistics", schema_userStatistics) };
