import '#config/env.js';
import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { facebookCallback } from '#modules/auth/services/facebook.services.js';

const hasFacebookCredentials = process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET;

if (!hasFacebookCredentials) {
  console.warn('⚠️ FACEBOOK_APP_ID hoặc FACEBOOK_APP_SECRET chưa được cấu hình trong .env');
  console.warn('⚠️ Facebook login sẽ không khả dụng cho đến khi credentials được cấu hình');
} else {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: `${process.env.BASE_URL || 'http://localhost:8000'}/api/auth/facebook/callback`,
    profileFields: ['id', 'emails', 'name'],
  }, facebookCallback));
  
}

// Lưu user vào session
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

export default passport;
