const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'A user must have a mail'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works on save
      validator: function (el) {
        return el === this.password;
      },
      message: 'Password are not the same ',
    },
  },
});

userSchema.pre('save', function (next) {
  if (!this.password.isModified('password')) next();
});

const User = mongoose.model('user', userSchema);

module.exports = User;
