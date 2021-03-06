const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const config = require('../config/database');
const User = require('../models/user');

// Register user
router.post('/register', (req, res, next) => {
  let newUser = new User({
    username: req.body.username,
    password: req.body.password,
    contacts: req.body.contacts
  });

  User.getUserByUsername(req.body.username, (err, user) => {
    if (err) throw err;
    if (user) {
      res.json({ success: false, msg: "User already exists."});
    } else {
      User.addUser(newUser, (err, user) => {
        if (err) {
          res.json({ success: false, msg: "Failed to register user" });
          console.log("Failed to register user: " + err);
        } else {
          res.json({ success: true, msg: "User registered" });
        }
      });
    }
  });

/*
  User.addUser(newUser, (err, user) => {
    if (err) {
      res.json({ success: false, msg: "Failed to register user" });
      console.log("Failed to register user: " + err);
    } else {
      res.json({ success: true, msg: "User registered" });
    }
  });
*/
});

// Authenticate
router.post('/authenticate', (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;

  User.getUserByUsername(username, (err, user) => {
    if (err) throw err;
    if (!user) {
      return res.json({ success: false, msg: 'User not found' });
    }

    User.comparePassword(password, user.password, (err, isMatch) => {
      if (err) throw err;
      if (isMatch) {
        const token = jwt.sign({ data: user }, config.secret, {
          expiresIn: 604800 // 1 week
        });

        res.json({
          success: true,
          token: 'Bearer ' + token,
          user: {
            id: user._id,
            username: user.username
          }
        });
      } else {
        return res.json({ success: false, msg: 'Wrong password' });
      }
    });
  });
});

// Return JSON-serialized contact list
router.get('/contacts', passport.authenticate('jwt', { session: false }), (req, res, next) => {
  res.json(req.user.contacts);
});

// Create new contact and add to db
router.put('/contacts/create', passport.authenticate('jwt', { session: false }), (req, res, next) => {
  const userId = req.user._id;
  const newContact = req.body;

  User.addContact(userId, newContact, (err, model) => {
    if (err) return res.json({ success: false, msg: err});

    res.json({ success: true, user: model });
  });
});

// Delete contact from db under authenticated user
router.delete('/contacts/delete/:id', passport.authenticate('jwt', { session: false }), (req, res, next) => {
  const userId = req.user._id;
  const contactId = req.params.id;

  if (!contactId.match(/^[0-9a-fA-F]{24}$/))
    return res.json({ success: false, msg: "Malformed object id"});

  User.deleteContact(userId, contactId, (err, user) => {
    if (err) return res.json({ success: false, msg: err });
    res.json({ success: true, user: user})
  });
});

module.exports = router;
