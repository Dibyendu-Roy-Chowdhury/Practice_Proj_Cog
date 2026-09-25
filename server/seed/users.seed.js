const bcrypt = require('bcryptjs');
const User   = require('../models/User');

module.exports = async function seedUsers() {
  await User.deleteMany({});
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  const ADMIN_PASS     = process.env.SEED_PASSWORD_ADMIN;
  const DEMO_PASS      = process.env.SEED_PASSWORD_DEMO;
  const PASS_RIMNA     = process.env.SEED_PASSWORD_RIMNA;
  const PASS_IYER      = process.env.SEED_PASSWORD_IYER;
  const PASS_SENTHEESH = process.env.SEED_PASSWORD_SENTHEESH;
  const PASS_HARPREET  = process.env.SEED_PASSWORD_HARPREET;
  const PASS_SUNIL     = process.env.SEED_PASSWORD_SUNIL;
  const PASS_MURUGESH  = process.env.SEED_PASSWORD_MURUGESH;
  const PASS_JISHNU    = process.env.SEED_PASSWORD_JISHNU;
  const PASS_HEMANT    = process.env.SEED_PASSWORD_HEMANT;
  const PASS_SAMIR     = process.env.SEED_PASSWORD_SAMIR;
  const PASS_HUSSAIN   = process.env.SEED_PASSWORD_HUSSAIN;
  const PASS_ANNAL     = process.env.SEED_PASSWORD_ANNAL;
  const PASS_SATISH    = process.env.SEED_PASSWORD_SATISH;

  const required = {
    SEED_PASSWORD_ADMIN: ADMIN_PASS, SEED_PASSWORD_DEMO: DEMO_PASS,
    SEED_PASSWORD_RIMNA: PASS_RIMNA, SEED_PASSWORD_IYER: PASS_IYER,
    SEED_PASSWORD_SENTHEESH: PASS_SENTHEESH, SEED_PASSWORD_HARPREET: PASS_HARPREET,
    SEED_PASSWORD_SUNIL: PASS_SUNIL, SEED_PASSWORD_MURUGESH: PASS_MURUGESH,
    SEED_PASSWORD_JISHNU: PASS_JISHNU, SEED_PASSWORD_HEMANT: PASS_HEMANT,
    SEED_PASSWORD_SAMIR: PASS_SAMIR,
  };
  const missing = Object.keys(required).filter((k) => !required[k]);
  if (missing.length) {
    throw new Error(`Missing required seed password env vars: ${missing.join(', ')}`);
  }

  await User.insertMany([
    { id: 1,  username: 'admin',                                  email: 'admin@cognizant.com',                 role: 'admin', status: 'Active',   password_hash: hash(ADMIN_PASS),     last_login: new Date(Date.now() - 86400000),   created_at: new Date('2025-01-15') },
    { id: 2,  username: 'senthil',       displayName: 'Senthil', email: 'senthil@cognizant.com',               role: 'admin', status: 'Active',   password_hash: hash(ADMIN_PASS),     last_login: new Date(Date.now() - 90000000),   created_at: new Date('2025-01-20') },
    { id: 3,  username: 'demo',          displayName: 'Demo',    email: 'demo@cognizant.com',                  role: 'admin', status: 'Active',   password_hash: hash(DEMO_PASS),      last_login: new Date(Date.now() - 3600000),    created_at: new Date('2026-01-01') },
    { id: 4,  username: 'rimna.radhakrishnan', displayName: 'Rimna Radhakrishnan',   email: 'Rimna.Radhakrishnan@cognizant.com',   role: 'admin', status: 'Active', password_hash: hash(PASS_RIMNA),     last_login: new Date(Date.now() - 3600000), created_at: new Date('2026-01-01') },
    { id: 5,  username: 'iyer.kasinath',       displayName: 'Iyer Kasinath',         email: 'Iyer.Kasinath@cognizant.com',         role: 'admin', status: 'Active', password_hash: hash(PASS_IYER),      last_login: new Date(Date.now() - 3600000), created_at: new Date('2026-01-01') },
    { id: 6,  username: 'sentheesh.lingam',    displayName: 'Sentheesh Lingam',      email: 'Sentheesh.Lingam@cognizant.com',      role: 'admin', status: 'Active', password_hash: hash(PASS_SENTHEESH), last_login: new Date(Date.now() - 3600000), created_at: new Date('2026-01-01') },
    { id: 7,  username: 'harpreet.sethi',      displayName: 'Harpreet Sethi',        email: 'Harpreet.Sethi@cognizant.com',        role: 'admin', status: 'Active', password_hash: hash(PASS_HARPREET),  last_login: new Date(Date.now() - 3600000), created_at: new Date('2026-01-01') },
    { id: 8,  username: 'sunil.pinnamaneni',   displayName: 'Sunil Pinnamaneni',     email: 'Sunil.Pinnamaneni@cognizant.com',     role: 'admin', status: 'Active', password_hash: hash(PASS_SUNIL),     last_login: new Date(Date.now() - 3600000), created_at: new Date('2026-01-01') },
    { id: 9,  username: 'murugesh.mayandi',    displayName: 'Murugesh Mayandi',      email: 'Murugesh.Mayandi@cognizant.com',      role: 'admin', status: 'Active', password_hash: hash(PASS_MURUGESH),  last_login: new Date(Date.now() - 3600000), created_at: new Date('2026-01-01') },
    { id: 10, username: 'jishnu.chatterji',    displayName: 'Jishnu Chatterji',      email: 'Jishnu.Chatterji@cognizant.com',      role: 'admin', status: 'Active', password_hash: hash(PASS_JISHNU),    last_login: new Date(Date.now() - 3600000), created_at: new Date('2026-01-01') },
    { id: 11, username: 'hemant.singhal',      displayName: 'Hemant Singhal',        email: 'Hemant.Singhal@cognizant.com',        role: 'admin', status: 'Active', password_hash: hash(PASS_HEMANT),    last_login: new Date(Date.now() - 3600000), created_at: new Date('2026-01-01') },
    { id: 12, username: 'samir.sawant',        displayName: 'Samir Sawant',          email: 'Samir.Sawant@cognizant.com',          role: 'admin', status: 'Active', password_hash: hash(PASS_SAMIR),     last_login: new Date(Date.now() - 3600000), created_at: new Date('2026-01-01') },
    { id: 13, username: 'hussain.sajid',       displayName: 'Hussain Sajid',         email: 'Hussain.Sajid@cognizant.com',         role: 'admin', status: 'Active', password_hash: hash(PASS_HUSSAIN),   last_login: new Date(Date.now() - 3600000), created_at: new Date('2026-01-01') },
    { id: 14, username: 'annal.tamizhnambi',    displayName: 'Annal Tamizhnambi',    email: 'Annal.Tamizhnambi@cognizant.com',     role: 'admin', status: 'Active', password_hash: hash(PASS_ANNAL),     last_login: new Date(Date.now() - 3600000), created_at: new Date('2026-01-01') },
    { id: 15, username: 'satish.hegde',         displayName: 'Satish Hegde',         email: 'Satish.Hegde@cognizant.com',          role: 'admin', status: 'Active', password_hash: hash(PASS_SATISH),    last_login: new Date(Date.now() - 3600000), created_at: new Date('2026-01-01') },
  ]);
};
