require('dotenv').config();

const mongo = require('./modules/mongo');
const formatUser = require('./format_user');

let users = require('./users.json');

async function pushUsers() {
    await mongo.connect('mongodb+srv://Guirxh:nano1987@cluster0.n7abz.mongodb.net/Heejin?retryWrites=true&w=majority');

    console.log("pushing users...");
    await Promise.all(users.map(user => {
        user = formatUser(user);

        return mongo.userManager.new(user._id, user);
    }));

    console.log(`${users.length} users added`);
}

pushUsers();