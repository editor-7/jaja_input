const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    sku: { type: String, trim: true, unique: true, sparse: true },
    name: { type: String, required: true },
    desc: { type: String, default: '' },
    spec: { type: String, default: '' },
    category: { type: String, default: '' },
    mainCategory: { type: String, default: '' }, // 지하관PLP | 지하관PEM | 노출관 | 공통
    laborOnly: { type: Boolean, default: false }, // 비고2=인건만 이면 true (자재 쌍 없음)
    price: { type: Number, required: true },
    img: { type: String, default: '' },
    size: { type: String, default: '1개' },
    unit: { type: String, default: 'EA' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
