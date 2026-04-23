const mongoose = require('mongoose');
const config = require('../config/env');
const Product = require('../models/Product');

async function run() {
  await mongoose.connect(config.MONGODB_URI);
  try {
    const beforeOld = await Product.countDocuments({ category: '견적제출완료' });
    const beforeNew = await Product.countDocuments({ category: '참조단가' });
    const result = await Product.updateMany(
      { category: '견적제출완료' },
      { $set: { category: '참조단가' } }
    );
    const afterOld = await Product.countDocuments({ category: '견적제출완료' });
    const afterNew = await Product.countDocuments({ category: '참조단가' });

    console.log('before old/new:', beforeOld, beforeNew);
    console.log('matched/modified:', result.matchedCount, result.modifiedCount);
    console.log('after old/new:', afterOld, afterNew);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

