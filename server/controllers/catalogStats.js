const mongoose = require('mongoose');
const Product = require('../models/Product');

/**
 * 관리자 전용: 현재 연결된 MongoDB와 상품·참조단가 배치 건수 요약
 */
const getSummary = async (req, res) => {
  try {
    const dbName = mongoose.connection.db?.databaseName || '';
    const total = await Product.countDocuments();
    const refAgg = await Product.aggregate([
      { $match: { category: { $regex: /^참조단가\d+$/ } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const reference = Object.fromEntries(refAgg.map((x) => [x._id, x.count]));
    res.json({
      database: dbName,
      total,
      reference,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSummary,
};
