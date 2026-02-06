const AppError = require('./appError');

const handleCastErrorDB = (err) => {
  const message = `invalid ${err.path}: ${err.value} `;

  return new AppError(message, 400);
};

const handleDuplicateErrorDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];

  const message = `Duplicate field value: ${value}. Please use another value.`;

  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;

  return new AppError(message, 404);
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      error: err,
      stack: err.stack,
    });
  }

  if (process.env.NODE_ENV === 'production') {
    let error = err;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateErrorDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);

    if (error.isOperational) {
      return res.status(error.statusCode).json({
        status: error.status,
        message: error.message,
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong',
    });
  }
};
