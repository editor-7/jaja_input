const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    sku: { type: String, trim: true, unique: true, sparse: true },
    name: { type: String, required: true },
    desc: { type: String, default: '' },
    spec: { type: String, default: '' },
    category: { type: String, default: '' },
    price: { type: Number, required: true },
    img: { type: String, default: '' },
    size: { type: String, default: '1개' },
    unit: { type: String, default: 'EA' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
