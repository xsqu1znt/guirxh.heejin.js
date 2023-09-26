const userManager = require("./uM_index");

/** @param {string} userID @param {number} amount */
async function balance_increment(userID, amount) {

}

module.exports = {
	balance: {
		increment: balance_increment
	}
};
