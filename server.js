const mongoose = require('mongoose');

const dotenv = require('dotenv');

dotenv.config({
  path: './config.env',
});
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => console.log('DB connection succesful!'));

const port = process.env.Port || 3001;

const server = app.listen(port, () => {
  console.log(`App is running on port ${port}...`);
});

process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);

  server.close(() => {
    process.exit(1);
  });
});
