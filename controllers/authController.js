const crypto = require('crypto');
const { promisify } = require('util');
const AppError = require('../appError');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const sendMail = require('../email');

function signUpToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
}

exports.signUp = async (req, res, next) => {
  try {
    const cookieOptions = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
      ),
      httpOnly: true,
    };
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
    });

    const token = signUpToken(newUser._id);
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    res.cookie('jwt', token, cookieOptions);

    // Remove the password from the Output
    newUser.password = undefined;

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
    const maxAttempts = 5;
    const timeWindow = 15;
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

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You are not allowed to perform this action', 403),
      );
    }

    next();
  };

exports.forgetPassword = async (req, res, next) => {
  try {
    // Get the user based on the posted mail
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return next(new AppError('Token sent if email exists', 401));
    }

    // Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // send it to the user's email
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

    const message = `Forgot your password? Submit a PACTH request with your new password and passwordConfirm to ${resetURL}.\n If you didnt forget password please ignore this message `;

    try {
      await sendMail({
        email: user.email,
        subject: 'Your password reset token (valid for 10 mins)',
        message,
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return next(
        new AppError(
          'There was an error sending this mail. Try again later',
          500,
        ),
      );
    }
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    next(err);
  }
};
exports.resetPassword = async (req, res, next) => {
  try {
    // Get the user based on token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');
    // If the token has not expired, and there is a user , set the password

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(new AppError('Token has expired', 400));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    // Update changedPasswordAt property for the user
    // Log the user in, send JWT
    const token = signUpToken(user._id);
    res.status(200).json({
      status: 'success',
      token,
    });
  } catch (err) {
    next(err);
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    // Get user from collection
    const user = await User.findById(req.user._id).select('+password');
    // Check if the POSTed password is correct
    if (
      !(await user.correctpassword(req.body.currentPassword, user.password))
    ) {
      return next(new AppError('Incorrect password', 401));
    }
    // if so, Update the password
    user.password = req.body.newPassword;
    user.passwordConfirm = req.body.confirmPassword;

    await user.save();

    // Log user in, send JWt
    const token = signUpToken(user._id);
    res.status(200).json({
      status: 'success',
      token,
    });
  } catch (err) {
    next(err);
  }
};
