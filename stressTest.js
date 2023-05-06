require('dotenv').config();

const { connect, userManager } = require('./modules/mongo');
const cardManager = require('./modules/cardManager');

async function giveManyCards(userID, num) {
    await connect();

    console.log("picking cards...");
    let cards = [...Array(num)].map(() => cardManager.get.drop("normal"));

    console.log("adding cards...");
    await userManager.cards.add(userID, cards, true);
    console.log(`user given ${cards.length} cards`);

    return;
}

giveManyCards("842555247145779211", 10000);