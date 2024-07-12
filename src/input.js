const fs = require('fs');
const R = require('ramda');
const { test } = require('ramda');


async function readInput(file) {
    const content = fs.readFileSync(file);
    return Promise.resolve(JSON.parse(content));
}

module.exports = {
    readInput
}