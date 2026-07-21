require('dotenv').config();
const mongoose = require('mongoose');
const { StoryWorld } = require('../models');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  await StoryWorld.deleteMany({});
  console.log('Cleared existing story worlds');

  const worlds = [
    {
      key: 'detective',
      name: 'The Detective',
      tagline: 'Solve puzzles. Connect the dots.',
      description:
        'You are a sharp-eyed investigator piecing together clues in dimly lit rooms. Every variable is an alias — the same person wearing different names. Track them down, one clue at a time.',
      flavorText: 'A 1940s private eye maps pseudonyms to their real identities.',
      icon: 'Search',
      colors: {
        primary: '#334155', // slate-700
        accent: '#0f172a',  // slate-900 (using as accent/gradient destination to match from-slate-700 to-slate-900)
      }
    },
    {
      key: 'scholar',
      name: 'The Scholar',
      tagline: 'Seek patterns across time and texts.',
      description:
        'You are a deep reader in a vast library where the same ancient truth hides under many titles. Your job is to trace connections, find the one essence beneath many surfaces.',
      flavorText: 'Two scholars discover the same text filed under different names across library wings.',
      icon: 'BookOpen',
      colors: {
        primary: '#ea580c', // amber-600
        accent: '#92400e',  // amber-800
      }
    },
    {
      key: 'space_explorer',
      name: 'The Space Explorer',
      tagline: 'Navigate the unknown with clarity.',
      description: 'You are a mission controller receiving signals from deep space. The same data arrives under different code names — your task is to recognise what\'s really being said, despite the noise.',
      flavorText: 'A deep-space probe transmits the same data under multiple call signs.',
      icon: 'Rocket',
      colors: {
        primary: '#4f46e5', // indigo-600
        accent: '#312e81',  // indigo-900
      }
    },
    {
      key: 'advocate',
      name: 'The Advocate',
      tagline: 'Make the case. Build the argument.',
      description:
        'You are a sharp advocate presenting evidence before a sceptical judge. Every alias hides a fact; your job is to build a watertight argument that leads to one undeniable conclusion.',
      flavorText: 'A witness gives two testimonies under different names, pointing to the same event.',
      icon: 'Scale',
      colors: {
        primary: '#059669', // emerald-600
        accent: '#064e3b',  // emerald-800
      }
    },
  ];

  await StoryWorld.insertMany(worlds);
  console.log(`Inserted ${worlds.length} story worlds`);

  await mongoose.disconnect();
  console.log('Story world seed complete.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
