const Tour = require('./../models/tourModel');
const mongoose = require('mongoose');
const APIFeatures = require('./../utils/apiFeatures');

// CUSTOM-MIDDLEWARE
exports.aliasTopTours = (req, res, next) => {
  const query = new URLSearchParams(req.query);
  query.set('limit', '5');
  query.set('sort', '-ratingsAverage,price');
  query.set('fields', 'name,price,ratingsAverage,summary,difficulty');

  // Rebuild the URL so Express reparses req.query
  req.url = `${req.path}?${query.toString()}`;

  // console.log('aliasData triggered:', req.url); // optional debug);

  // TODO : NOT WORKING PROPERLY
  // req.query.limit = '5';
  // req.query.sort = '-ratingsAverage,price';
  // req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  // console.log('req.query > ', req.query);
  next();
};

// HANDLERS
exports.getAllTours = async (req, res) => {
  try {
    console.log(`req.query >`, req.query);

    // EXECUTE QUERY
    const features = new APIFeatures(Tour.find(), req.query)
      .sort()
      .limitFields()
      .paginate()
      .filter();

    const tours = await features.query;

    // const tours = await Tour.find();
    // const tours = await Tour.find({ duration: { $gte: '5' } });

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: tours.length,
      data: {
        tours,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: 'fail',
      message: error.message,
    });
  }
};

exports.getTour = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);
    // brief -> Tour.findOne({ _id: req.params.id })

    res.status(200).json({
      status: 'success',
      data: {
        tour,
      },
    });
  } catch (err) {
    res.status(400).json({
      success: 'fail',
      message: err,
    });
  }
};

exports.createTour = async (req, res) => {
  try {
    // const newTour = new Tour({});
    // newTour.save()

    const newTour = await Tour.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        tour: newTour,
      },
    });
  } catch (err) {
    res.status(400).json({
      success: 'fail',
      message: err,
    });
  }
};

exports.updateTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      status: 'success',
      data: { tour },
    });
  } catch (err) {
    res.status(400).json({
      success: 'fail',
      message: err,
    });
  }
};

exports.deleteTour = async (req, res) => {
  try {
    await Tour.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    res.status(400).json({
      success: 'fail',
      message: err,
    });
  }
};

exports.getTourStats = async (req, res) => {
  try {
    // STAGES IN MONGODB
    const stats = await Tour.aggregate([
      {
        $match: { ratingsAverage: { $gte: 4.5 } },
      },
      {
        $group: {
          _id: { $toUpper: '$difficulty' },
          numTours: { $sum: 1 },
          ratingsAvg: { $avg: '$ratingsAverage' },
          numRatings: { $sum: '$ratingsQuantity' },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
        },
      },
      {
        $sort: { avgPrice: 1 },
      },
      // ADVANCED FILTERING
      // {
      //   $match: { _id: { $ne: 'EASY' } },
      // },
    ]);

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (err) {
    res.status(400).json({
      success: 'fail',
      message: err,
    });
  }
};

exports.getMonthlyPlan = async (req, res) => {
  try {
    const year = req.params.year * 1;

    const plan = await Tour.aggregate([
      {
        // seperating the array with individual records
        $unwind: '$startDates',
      },
      {
        // matching the dates within a respective year
        $match: {
          startDates: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      // grouping and showing how many tours within a month
      {
        $group: {
          _id: { $month: '$startDates' },
          numTourStarts: { $sum: 1 },
          tours: { $push: '$name' },
        },
      },
      // adding new field in data as month
      {
        $addFields: {
          month: '$_id',
        },
      },
      // removing the _id field
      {
        $project: {
          _id: 0,
        },
      },
      {
        $sort: {
          numTourStarts: -1, // in descending order
          // month: 1,  in ascending order
        },
      },
      {
        $limit: 12,
      },
    ]);

    res.status(200).json({
      status: 'success',
      results: plan.length,
      data: plan,
    });
  } catch (err) {
    res.status(400).json({
      success: 'fail',
      message: err.message,
    });
  }
};
