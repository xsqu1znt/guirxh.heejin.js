const { Schema, model } = require("mongoose");

const schema_questData = new Schema(
	{
		_id: { type: String, require: true },

		balance: Number,
		ribbons: Number,
		inventory_count: Number,
		level_user: Number,
		level_idol: Number,
		team_ability: Number,
		team_reputation: Number
	},
	{ collection: "user_quest_data" }
);

module.exports = {
	schema: schema_questData,
	model: model("user_quest_data", schema_questData)
};
