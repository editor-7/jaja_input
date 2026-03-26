const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const SALT_ROUNDS = 10;

const canAccessUser = (requestUser, targetUserId) => {
  if (!requestUser) return false;
  if (requestUser.user_type === 'admin') return true;
  return String(requestUser._id) === String(targetUserId);
};

const sanitizeUser = (userDoc) => {
  const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete user.password;
  return user;
};

// Create - 유저 생성
const createUser = async (req, res) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ message: '이메일, 이름, 비밀번호를 모두 입력해 주세요.' });
    }
    
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    const user = await User.create({
      email,
      name,
      password: hashedPassword,
      // 회원가입 요청에서는 role 승격 입력을 무시하고 customer로 고정한다.
      user_type: 'customer',
    });
    
    res.status(201).json(sanitizeUser(user));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: '이미 존재하는 이메일입니다.' });
    }
    console.error('회원가입 오류:', error);
    res.status(400).json({ message: error.message || '회원가입에 실패했습니다.' });
  }
};

// Login - 로그인
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: '이메일과 비밀번호를 입력해 주세요.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: '가입되지 않은 이메일입니다.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: '비밀번호가 올바르지 않습니다.' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      config.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      message: '로그인 성공',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ message: '로그인 처리 중 오류가 발생했습니다.' });
  }
};

// Read All - 유저 목록 조회
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Read One - 유저 단일 조회
const getUserById = async (req, res) => {
  try {
    if (!canAccessUser(req.user, req.params.id)) {
      return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update - 유저 수정
const updateUser = async (req, res) => {
  try {
    if (!canAccessUser(req.user, req.params.id)) {
      return res.status(403).json({ message: '수정 권한이 없습니다.' });
    }
    const { password, ...updateData } = req.body;

    // 일반 사용자는 user_type을 변경할 수 없다.
    if (req.user?.user_type !== 'admin') {
      delete updateData.user_type;
    }
    
    // 비밀번호가 포함된 경우 암호화
    if (password) updateData.password = await bcrypt.hash(password, SALT_ROUNDS);
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });
    }
    res.json(user);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: '이미 존재하는 이메일입니다.' });
    }
    res.status(400).json({ message: error.message });
  }
};

// Delete - 유저 삭제
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });
    }
    res.json({ message: '유저가 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createUser,
  login,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
