const { Schema, model } = require("mongoose");

const schema_questData = new Schema(
	{
		_id: { type: String, require: true },

		balance: Number,
		ribbon: Number,
		daily_streak: Number,
		user_level: Number,
		xp: Number,
		inventory_count: Number,
		idol_level: Number,
		team_power: Number
	},
	{ collection: "user_quest_data" }
);

module.exports = {
	schema: schema_questData,
	model: model("user_quest_data", schema_questData)
};
