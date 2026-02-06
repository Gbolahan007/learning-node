const AppError = require('../appError');
const Tour = require('../models/tourModel');
const apiFeatures = require('../utils/apiFeatures');

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';

  next();
};
// GET all tours
exports.getAllTours = async (req, res) => {
  try {
    let query = Tour.find();
    if (!query) {
      res.status(404).json({
        status: 'fail',
        message: 'there is no query',
      });
    }
    const queryObj = { ...req.query };

    query = apiFeatures.filter(query, queryObj);
    query = apiFeatures.sort(query, req.query);
    query = apiFeatures.limitFields(query, req.query);
    query = await apiFeatures.paginate(query, req.query, Tour);

    const tours = await query;

    res.status(200).json({
      status: 'success',
      result: tours.length,
      data: { tours },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

// exports.getAllTours = async (req, res) => {
//   try {
//     console.log(req.query);

//     //BUILD QUERY
//     const queryObj = { ...req.query };

//     //  FILTERING
//     const excludeFields = ['page', 'limit', 'sort', 'fields'];
//     excludeFields.forEach((el) => delete queryObj[el]);

//     // ADVANCED FILTERING
//     let queryStr = JSON.stringify(queryObj);
//     queryStr = queryStr.replace(/\b(gte|gt|lt|lte)\b/g, (match) => `$${match}`);

//     let query = Tour.find(JSON.parse(queryStr));

//     // SORTING
//     if (req.query.sort) {
//       const sortBy = req.query.sort.split(',').join(' ');

//       query = query.sort(sortBy);
//     } else {
//       query = query.sort('-createdAt');
//     }

//     //FIELD LIMITING
//     if (req.query.fields) {
//       const fields = req.query.fields.split(',').join(' ');
//       query = query.select(fields);
//     } else {
//       query = query.select('-__v');
//     }

//     //PAGINATION
//     const page = req.query.page * 1 || 1;
//     const limit = req.query.limit * 1 || 100;

//     const skip = (page - 1) * limit;
//     //?page=2&limit=10
//     query = query.skip(skip).limit(limit);

//     if (req.query.page) {
//       const numTours = await Tour.countDocuments();

//       if (skip >= numTours) {
//         throw new Error('this page does not exist');
//       }
//     }

//     //EXECUTE QUERY
//     const tours = await query;

//     // {difficulty:'easy', duration:{$gte:5}}
//     //    const query = Tour.find(queryObj)
//     //   .where('duration'),
//     //   .equals(5)
//     //   .where('difficulty')
//     //   .equals('easy');

//     //SEND RESPONSE
//     res.status(200).json({
//       status: 'success',
//       result: tours.length,
//       data: {
//         tours,
//       },
//     });
//   } catch (err) {
//     res.status(400).json({
//       status: 'fail',
//       message: err,
//     });
//   }
// };

// GET a single tour by ID

exports.getTour = async (req, res, next) => {
  try {
    const tour = await Tour.findById(req.params.id);

    if (!tour) {
      return next(new AppError('There is no tour with that id', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        tour,
      },
    });
  } catch (err) {
    next(err);
  }
};

// CREATE a new tour
exports.createTour = async (req, res, next) => {
  try {
    const newTour = await Tour.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        tour: newTour,
      },
    });
  } catch (err) {
    next(err);
  }
};

// UPDATE a tour
exports.updateTour = async (req, res, next) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!tour) {
      return next(new AppError('There is no tour with that id', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        tour,
      },
    });
  } catch (err) {
    next(err);
  }
};

// DELETE a tour
exports.deleteTour = async (req, res) => {
  const tour = await Tour.findByIdAndDelete(req.params.id);

  if (!tour) {
    res.status(404).json({
      status: 'fail',
      message: 'there is no tour with that id',
    });
  }

  try {
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    res.status(204).json({
      status: 'success',
      message: err,
    });
  }
};

exports.getTourStats = async (req, res) => {
  try {
    const stats = await Tour.aggregate([
      {
        $match: { ratingsAverage: { $gte: 4.5 } },
      },
      {
        $group: {
          _id: '$difficulty',
          sumTours: { $sum: 1 },
          numRatings: { $sum: '$ratingsQuantity' },
          avgRating: { $avg: '$ratingsAverage' },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
        },
      },
      {
        $sort: { avgPrice: 1 },
      },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: 'Invalid data sent',
    });
  }
};

exports.getMonthlyPlan = async (req, res) => {
  try {
    const year = req.params.year * 1;
    const plan = await Tour.aggregate([
      { $unwind: '$startDates' },
      {
        $match: {
          startDates: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },

      {
        $group: {
          _id: { $month: '$startDates' },
          numToursStart: { $sum: 1 },
          tours: { $push: '$name' },
        },
      },
      { $addFields: { month: '$_id' } },
      { $project: { _id: 0 } },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        plan,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: 'Invalid data sent',
    });
  }
};
