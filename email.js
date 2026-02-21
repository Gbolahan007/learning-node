const nodemailer = require('nodemailer');

const sendMail = async (options) => {
  // Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  // Define the email
  const mailOptions = {
    from: 'Lawal Quam <lawalomogbolahan08@gmail.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };
  //Actually send the mail
  await transporter.sendMail(mailOptions);
};

module.exports = sendMail;
