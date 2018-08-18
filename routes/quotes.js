'use strict';

const express = require('express');
const router = express.Router();
const Quote = require('../models/quote');

const upload = require('../middlewares/upload');

// ---------- Index ---------- //
router.get('/', (req, res, next) => {
  Quote.find({}).populate('owner')
    .then((result) => {
      const data = {
        welcomeMessage: req.flash('welcomeMessage'),
        quotes: result
      };
      res.render('pages/quotes/index', data);
    })
    .catch(next);
});

// ---------- New ---------- //
router.get('/new', (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('auth/login');
  };
  const data = { errorMessage: req.flash('newQuoteError') };
  res.render('pages/quotes/new', data);
});

// ---------- Create ---------- //
router.post('/', upload.single('photo'), (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('auth/login');
  };

  const {body, from, location} = req.body;

  let background;
  
  if (req.file) {
    background = (url => {
      const backgroundConfig = "w_360,h_368";
      const array = url.split("/");
      array.splice(6, 0, backgroundConfig);
      array.splice(0, 2, "https:/");
      const parsedUrl = array.join("/");
      return parsedUrl;
    })(req.file.secure_url)
  }

  if (!body) {
    req.flash('newQuoteError', 'Cannot submit an empty quote');
    return res.redirect('/quotes/new');
  };

  if (!from) {
    req.flash('newQuoteError', 'Please tell us who said it');
    return res.redirect('/quotes/new');
  };

  if (!location) {
    req.flash('newQuoteError', 'Please tell us where you heared it');
    return res.redirect('/quotes/new');
  }

  if (!background) {
    req.flash('newQuoteError', 'Please upload a background picture');
    return res.redirect('/quotes/new');
  }

  const quote = new Quote({body, from, location, background});
  quote.owner = req.session.user;
  quote.save()
    .then(() => {
      res.redirect(`/quotes`);
    })
    .catch(next);
});

// ---------- Edit ---------- //
router.get('/:id/edit', (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  };
  Quote.findOne({ _id: req.params.id })
    .then((result) => {
      if (!result) {
        next();
        return;
      }
      const data = { quote: result };
      res.render('pages/quotes/edit', data);
    })
    .catch(next);
});

// ---------- Update --------- //
router.post('/:id', (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  };
  const data = {
    name: req.body.name,
    photo: req.body.photo,
    quote: req.body.quote,
    user: req.session.user
  };
  Quote.update({ _id: req.params.id }, data)
    .then(() => {
      res.redirect(`/quotes/${req.params.id}`);
    })
    .catch(next);
});

// ---------- Delete ---------- //
router.post('/:id/delete', (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  };
  Quote.remove({ _id: req.params.id })
    .then(() => {
      res.redirect(`/quotes`);
    })
    .catch(next);
});

// ---------- Like ---------- //
router.post('/:id/like', (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  };

  const id = req.params.id;
  let alreadyLiked = false;
  let update = {};

  Quote.findById(id)
    .then((quote) => {
      quote.likes.forEach((like) => {
        if (like.equals(req.session.user._id)) {
          alreadyLiked = true;
        }
      });

      if (alreadyLiked) {
        update = { '$inc': { 'likeCount': -1 }, '$pull': { 'likes': req.session.user._id } };
      } else {
        update = { '$inc': { 'likeCount': 1 }, '$push': { 'likes': req.session.user._id } };
      }
      return Quote.findByIdAndUpdate(id, update, {new: true});
    })
    .then((quote) => {
      if (!alreadyLiked) {
        res.json({ action: 'liked', likes: quote.likeCount });
      } else {
        res.json({ action: 'unliked', likes: quote.likeCount });
      }
    })
    .catch(next);
});

module.exports = router;
