const { Schema, model } = require('mongoose');

const schema_guild = Schema({
    _id: { type: String, require: true },

    reminders: { type: Array, default: new Array() }
}, { collection: "guilds" });

module.exports = model("guilds", schema_guild);