import nodemailer from 'nodemailer';

const sendMail = async ({ email, resetToken }) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_NAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const info = await transporter.sendMail({
    from: '"Web site Bất Động Sản DP " <no-reply@BDS.email>',
    to: email,
    subject: "Reset Password",
    html: `please u click link for reset your password <a href="${process.env.URL_SERVER}/reset-password?token=${resetToken}">Reset Password</a>`,
  });
  return info;
};

export default sendMail;
