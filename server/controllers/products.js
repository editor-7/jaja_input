const mongoose = require('mongoose');
const Product = require('../models/Product');

const isValidId = (id) => {
  if (!id || typeof id !== 'string') return false;
  try {
    return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
  } catch {
    return false;
  }
};

const getAll = async (req, res) => {
  try {
    const products = await Product.find().lean().sort({ sku: 1, _id: 1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: '잘못된 상품 ID입니다.' });
    }
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const { sku, name, desc, spec, category, price, img, size, unit } = req.body;
    if (!name || price == null) {
      return res.status(400).json({ message: '상품명과 가격을 입력해 주세요.' });
    }
    const skuVal = (typeof sku === 'string' ? sku : String(sku ?? '')).trim();
    const doc = {
      name,
      desc: desc || `정성스럽게 구운 ${name}`,
      spec: (typeof spec === 'string' ? spec : String(spec ?? '')).trim(),
      category: category || name,
      price: Number(price),
      img: img || '',
      size: size || '1개',
      unit: unit || 'EA',
    };
    if (skuVal) doc.sku = skuVal;
    const product = await Product.create(doc);
    res.status(201).json(product);
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.sku) {
      return res.status(400).json({ message: '이미 사용 중인 SKU입니다.' });
    }
    res.status(400).json({ message: error.message });
  }
};

const update = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: '잘못된 상품 ID입니다.' });
    }
    const { sku, name, desc, spec, category, price, img, size, unit } = req.body;
    const skuVal = (typeof sku === 'string' ? sku : String(sku ?? '')).trim();
    const $set = {
      name: String(name ?? '').trim(),
      desc: String(desc ?? '').trim(),
      category: String(category ?? '').trim(),
      price: Number(price) || 0,
      img: String(img ?? '').trim() || '',
    };
    if (spec !== undefined) $set.spec = String(spec ?? '').trim();
    if (size !== undefined) $set.size = size;
    if (unit !== undefined) $set.unit = unit;
    if (skuVal) $set.sku = skuVal;
    const updateOp = skuVal ? { $set } : { $set, $unset: { sku: 1 } };
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateOp,
      { new: true, runValidators: true }
    );
    if (!product) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }
    res.json(product);
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.sku) {
      return res.status(400).json({ message: '이미 사용 중인 SKU입니다.' });
    }
    res.status(400).json({ message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: '잘못된 상품 ID입니다.' });
    }
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }
    res.json({ message: '상품이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
