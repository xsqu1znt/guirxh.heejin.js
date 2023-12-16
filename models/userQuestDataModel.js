const { Schema, model } = require("mongoose");

const schema_questData = new Schema(
	{
		_id: { type: String, require: true },

		balance: { type: Number, default: 0 },
		ribbons: { type: Number, default: 0 },
		daily_streak: { type: Number, default: 0 },
		xp_user: { type: Number, default: 0 },
		xp_idol: { type: Number, default: 0 },
		level_user: { type: Number, default: 0 },
		level_idol: { type: Number, default: 0 },
		team_power: { type: Number, default: 0 },
		cards_new: { type: Number, default: 0 }
	},
	{ collection: "user_quest_data" }
);

module.exports = {
	schema: schema_questData,
	model: model("user_quest_data", schema_questData)
};
