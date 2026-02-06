// Import Express framework (used to build the server)
const express = require('express');

// Import Morgan (HTTP request logger middleware)
const morgan = require('morgan');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const globalErrorHandler = require('./globalErrorHandler');

// Create Express application
const app = express();

// =======================
// GLOBAL MIDDLEWARES
// (runs for EVERY request)
// =======================

// Logs request details to the console (method, URL, status, time)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Parses incoming JSON request bodies
// Makes req.body available
app.use(express.json());

app.use(express.static('./public'));

// Adds a custom property to the request object
// Useful for debugging or logging
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// Tours routes
// app.get('/api/v1/tours', getAllTours);
// app.get('/api/v1/tours/:id', getTour);
// app.post('/api/v1/tours', createTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);

// ROUTES
app.use('/api/v1/users', userRouter);
app.use('/api/v1/tours', tourRouter);

app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Cant find ${req.originalUrl} on this server`,
  // });

  const err = new Error(
    `Cant find ${req.originalUrl} on this server, Pls check the route again`,
  );
  err.status = 'fail';
  err.statusCode = 404;

  next(err);
});

app.use(globalErrorHandler);

// app.use((err, req, res, next) => {
//   err.statusCode = err.statusCode || 500;
//   err.status = err.status || 'error';

//   res.status(err.statusCode).json({
//     status: err.status,
//     message: err.message,
//   });
// });

module.exports = app;
