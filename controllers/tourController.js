const fs = require('fs');
const express = require('express');

const app = express();

// Adds a custom property to the request object
// Useful for debugging or logging
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// Read tours data from JSON file
const tours = JSON.parse(
  fs.readFileSync('./dev-data/data/tours-simple.json', 'utf-8'),
);

exports.checkBody = (req, res, next) => {
  console.log(req.body);
  if (!req.body.name || !req.body.price) {
    return res.status(400).json({
      status: 'fail',
      message: 'Missing name or price',
    });
  }
  next();
};
exports.checkId = (req, res, next, val) => {
  if (req.params.id * 1 > tours.length) {
    return res.status(404).json({
      status: 'fail',
      message: 'Invalid ID',
    });
  }
  next();
};
// =======================
// ROUTE HANDLER FUNCTIONS
// (business logic)
// =======================
// GET all tours
exports.getAllTours = (req, res) => {
  res.status(200).json({
    status: 'success',
    requestedAt: req.requestTime, // comes from middleware
    result: tours.length,
    data: {
      tours,
    },
  });
};

// GET a single tour by ID
exports.getTour = (req, res) => {
  const id = req.params.id * 1; // convert string to number

  // Find the tour
  const tour = tours.find((el) => el.id === id);

  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });
};

// CREATE a new tour
exports.createTour = (req, res) => {
  // Generate new ID
  const newId = tours[tours.length - 1].id + 1;

  // Merge ID with request body
  const newTour = { id: newId, ...req.body };

  // Add new tour to array
  tours.push(newTour);

  // Save to file (simulate DB write)
  fs.writeFile(
    './dev-data/data/tours-simple.json',
    JSON.stringify(tours),
    () => {
      res.status(201).json({
        status: 'success',
        data: {
          tour: newTour,
        },
      });
    },
  );
};

// UPDATE a tour
exports.updateTour = (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      tour: 'updated tour',
    },
  });
};

// DELETE a tour
exports.deleteTour = (req, res) => {
  res.status(204).json({
    status: 'success',
    data: null,
  });
};
