// Imports our event scripts and binds them to their intended event triggers.

const fs = require('fs');

const { Client } = require('discord.js');
const logger = require('../logger');

module.exports = {
    /** @param {Client} client */
    init: (client) => {
        let events = {
            ready: importEvents('../../events/ready'),
            // ready: importEvents('./events/ready'),

            interaction: {
                create: importEvents('../../events/interaction/create')
                // create: importEvents('./events/interaction/create')
            }
        };

        // Bind the functions
        // * Ready
        client.on("ready", async () => {
            events.ready.forEach(foo => executeEvent(foo, client));
        });

        // * Interaction
        // Interaction -> Create
        client.on("interactionCreate", async (interaction) => {
            let args = { interaction };
            events.interaction.create.forEach(foo => executeEvent(foo, client, args));
        });
    }
};

// ! Helper Functions
function importEvents(dir) {
    let files = fs.readdirSync(`.${dir}`).filter(fn => fn.endsWith('.js'));
    // let files = fs.readdirSync(`${dir}`).filter(fn => fn.endsWith('.js'));
    let funcs = [];

    files.forEach(fn => funcs.push(require(`${dir}/${fn}`)));
    // files.forEach(fn => funcs.push(require(`../.${dir}/${fn}`)));
    return funcs;
}

function executeEvent(foo, ...args) {
    try {
        foo.execute.apply(null, args);
    } catch (err) {
        logger.error("Failed to execute event function", `\"${foo.name}\" on event \"${foo.event}\"`, err);
    }
}