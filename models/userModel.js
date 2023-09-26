const { Schema, model } = require("mongoose");

// prettier-ignore
const schema_user = new Schema({
    _id: { type: String, require: true },

    daily_streak: { type: Number, default: 0 },
    daily_streak_expires: { type: Number, default: 0 },

    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    xp_for_next_level: { type: Number, default: 50 },

    biography: { type: String, default: new String() },
    balance: { type: Number, default: 0 },
    ribbons: { type: Number, default: 0 },

    badges: { type: Array, default: new Array() },
    charms: { type: Map, default: new Map() },

    card_selected_uid: { type: String, default: new String() },
    card_favorite_uid: { type: String, default: new String() },
    card_team_uids: { type: Array, default: new Array() },
    card_inventory: { type: Array, default: new Array() },

    cooldowns: { type: Array, default: new Array() },
    reminders: { type: Array, default: new Array() },

    quests_complete: { type: Array, default: new Array() },
    timestamp_started: { type: Number, require: true }
}, { collection: "users" });

module.exports = { schema: schema_user, model: model("users", schema_user) };
