const { Schema, model } = require("mongoose");

const schema_questData = new Schema(
	{
		_id: { type: String, require: true },

		balance: { type: Number, default: 0 },
		ribbon: { type: Number, default: 0 },
		daily_streak: { type: Number, default: 0 },
		user_level: { type: Number, default: 0 },
		xp: { type: Number, default: 0 },
		inventory_count: { type: Number, default: 0 },
		idol_level: { type: Number, default: 0 },
		team_power: { type: Number, default: 0 }
	},
	{ collection: "user_quest_data" }
);

module.exports = {
	schema: schema_questData,
	model: model("user_quest_data", schema_questData)
};
