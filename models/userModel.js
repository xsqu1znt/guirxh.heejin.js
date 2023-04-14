const { Schema, model } = require('mongoose');

const schema_user = Schema({
    _id: { type: String, require: true },

    daily_streak: { type: Number, default: 0 },

    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    xp_for_next_level: { type: Number, default: 1000 },

    biography: { type: String, default: new String() },
    balance: { type: Number, default: 0 },

    badges: { type: Map, default: new Map() },

    card_selected_uid: { type: String, default: new String() },
    card_favorite_uid: { type: String, default: new String() },
    card_team_uids: { type: Array, default: new Array() },
    card_inventory: { type: Array, default: new Array() },

    cooldowns: { type: Map, default: new Map() },
    reminders: { type: Map, default: new Map() },

    timestamp_started: { type: Number, require: true }
}, { collection: "users" });

module.exports = model("users", schema_user);