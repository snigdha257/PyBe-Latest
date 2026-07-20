/**
 * migrate-user-themes.js
 *
 * Assigns a default theme to all existing users who registered before
 * the theme field existed.
 *
 * Existing users get 'detective' (the first theme) so their stories
 * continue working without any code changes on the client side.
 *
 * Safe to re-run: already-migrated users (theme != null) are skipped.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../models');

async function main() {
  // Wait for mongoose to fully connect before running queries
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const DEFAULT_THEME = 'detective';

  const result = await User.updateMany(
    { theme: { $in: [null, undefined] } },
    { $set: { theme: DEFAULT_THEME } }
  );

  console.log(
    `Migrated ${result.modifiedCount} user(s) to theme "${DEFAULT_THEME}".`
  );

  const remaining = await User.countDocuments({ theme: { $in: [null, undefined] } });
  console.log(`${remaining} user(s) still without a theme.`);

  await mongoose.disconnect();
  console.log('Done.');
}

main()
  .then(() => { process.exit(0); })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });