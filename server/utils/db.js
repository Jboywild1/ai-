const fs = require('fs').promises;
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

async function readData(name) {
  const file = path.join(dataDir, `${name}.json`);
  try {
    const raw = await fs.readFile(file, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    // If file doesn't exist or is empty, return an empty array
    return [];
  }
}

async function writeData(name, data) {
  const file = path.join(dataDir, `${name}.json`);
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = { readData, writeData };
