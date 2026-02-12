const { promisify } = require('util');
const AppError = require('../appError');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

function signUpToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
}

exports.signUp = async (req, res, next) => {
  try {
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
      passwordChangedAt: req.body.passwordChangedAt,
    });

    const token = signUpToken(newUser._id);

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: newUser,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if there is email || password
    if (!email || !password) {
      return next(new AppError('Please input your email and password', 400));
    }

    // Check if user exist and password is correct
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctpassword(password, user.password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    // If everything is ok, send token to client
    const token = signUpToken(user._id);
    res.status(200).json({
      status: 'success',
      token,
    });
  } catch (err) {
    next(err);
  }
};

exports.protect = async (req, res, next) => {
  try {
    let token;
    // Getting token and check if it is there
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return next(
        new AppError('You are not logged in, Please login to get access', 401),
      );
    }
    // Verification of token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // Check if users still exist
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return next(
        new AppError('The user belonging to this token no longer exist ', 401),
      );
    }
    // Check if user changed password after token was issued
    if (currentUser.changedpasswordAfter(decoded.iat)) {
      return next(
        new AppError('User recently changed password! Please login again', 401),
      );
    }

    // GRENTED ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    next();
  } catch (err) {
    next(err);
  }
};
