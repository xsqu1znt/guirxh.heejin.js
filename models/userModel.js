const { Schema, model } = require('mongoose');

const schema_user = Schema({
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

    card_selected_uid: { type: String, default: new String() },
    card_favorite_uid: { type: String, default: new String() },
    card_team_uids: { type: Array, default: new Array() },
    card_inventory: { type: Array, default: new Array() },

    cooldowns: { type: Array, default: new Array() },
    reminders: { type: Array, default: new Array() },

    timestamp_started: { type: Number, require: true },

    quests_completed: { type: Array, default: new Array() },
    quest_cache: {
        type: Object, default: {
            balance: 0, ribbons: 0, inventory_count: 0,
            levels: { user: 0, idol: 0 },
            team: { ability: 0, reputation: 0 },
        }
    }
}, { collection: "users" });

module.exports = model("users", schema_user);