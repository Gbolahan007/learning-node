exports.filter = (query, queryObj) => {
  const excludeFields = ['page', 'limit', 'sort', 'fields'];
  excludeFields.forEach((el) => delete queryObj[el]);

  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lt|lte)\b/g, (m) => `$${m}`);

  return query.find(JSON.parse(queryStr));
};

exports.sort = (query, reqQuery) => {
  if (reqQuery.sort) {
    return query.sort(reqQuery.sort.split(',').join(' '));
  }
  return query.sort('-createdAt');
};

exports.limitFields = (query, reqQuery) => {
  if (reqQuery.fields) {
    return query.select(reqQuery.fields.split(',').join(''));
  }
  return query.select('-__v');
};

exports.paginate = async (query, reqQuery, Model) => {
  const page = reqQuery.page * 1 || 1;
  const limit = reqQuery.limit * 1 || 100;
  const skip = (page - 1) * limit;

  if (reqQuery.page) {
    const numDocs = await Model.countDocuments();
    if (skip >= numDocs) throw new Error('This page does not exist');
  }

  return query.skip(skip).limit(limit);
};
