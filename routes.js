const path = require('path')
const { body, query, validationResult, } = require('express-validator/check')
const { sanitizeBody, } = require('express-validator/filter')
const moment = require('moment');

const User = require('./userModel')
const root = path.resolve(__dirname, ".")
const publicPath = path.join(root, "public")

module.exports = function(app) {

  // DEBUG use to delete users as needed, delete later
  // User.deleteOne({ _id: "5b6710b887e06925b22a8bcb"}, (err, user) => {
  //   if (err) return next(new Error(err))
  //   console.log(user)
  // })

  ///////////////////////////////////////////////////////////
  // Testing/Debug Middleware
  ///////////////////////////////////////////////////////////
  app.use((req, res, next) => {
    console.debug(`DEBUG originalUrl: ${req.originalUrl}`)
    next()
  })


  ///////////////////////////////////////////////////////////
  // Root Route Handler
  ///////////////////////////////////////////////////////////
  app.get('/', (req, res, next) => {
    res.sendFile(path.join(publicPath, 'index.html'))
  });

  // Debug route to view users in DB
  app.get("/api/exercise/users", (req, res, next) => {
    User.find({})
    .exec((err, users) => {
      if (err) next(new Error(err))
      res.json(users)
    })
  })

  // Debug route to view single user in DB
  app.get("/api/users/:username", (req, res, next) => {
    const { username } = req.params
    User.findOne({username}, { _id: 0, username: 1, exercises: 1 })
      .exec((err, {username, exercises}) => {
        if (err) next(new Error(err))
        res.json({username, exercises})
      })
  })

  ///////////////////////////////////////////////////////////
  // Register New User
  ///////////////////////////////////////////////////////////
  app.post('/api/exercise/new-user', [

    // Username validation
    body('username')
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('Username must be between 3 and 20 characters, inclusive')
      .isAlphanumeric(),
  //    .withMessage('Username must consist of only alphanumeric characters'),

  ], (req, res, next) => {
    const { username } = req.body
    console.log({ username });
   
    const newUser = new User({ username })

    newUser.save(function(err,room) {
      res.json({
        _id: room.id,
        username: room.username
      })
      console.log(room.id);
   })
  });

  //Route for submitting exercise
  app.post('/api/exercise/add', [

    // Exercise validation
    

    body('description')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Description must be between 3 and 20 characters, inclusive')
      .optional({ checkFalsy: true, }).isAscii()
      .withMessage('Description must contain only valid ascii characters'),

    body('duration')
      .trim()
      .isLength({ min: 1, max: 9999 })
      .withMessage('Duration must be between 1 and 9999 characters, inclusive')
      .isNumeric()
      .withMessage('Duration must be a numeric value'),

    

  ], (req, res, next) => {
    var { userId, description, duration, date } = req.body
    if (date === ''){
      date = new Date(0);
    };


    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const { param, msg: message, } = errors.array()[0]
      return next({ param, message, })
    }

    
    const newExercise = {
      description : description,
      duration : duration,
      date: date
    }

    User.findOne({ _id: userId }, function (err, data) {
      if(err) {
        return next(new Error(`Something went wrong`))
      }
      if(data === null) {
        return next(new Error(`Username ${userId} not found`))
      }

      data.exercises.push(newExercise)
      data.save((err, data) => {
        if (err) {
          return next(new Error(`Could not save data`))
        }
        return res.json({
          username: data.username,
          description: description,
          duration: duration,
          _id: data.id,
          date: newExercise.date || new Date()
        })
      })
    })
  })

  /*route for retrieving user/exercise info
    GET /exercise/log?{userId}[&from][&to][&limit]
  .get - req, res =>
  use req.query to retrieve info from db
  error response if not matched
  respond with json info if found
  */
app.get('/api/exercise/log', (req, res, next) => {
  let { userId, from, to, limit } = req.query;
  from = moment(from, 'YYYY-MM-DD').isValid() ? moment(from, 'YYYY-MM-DD') : 0;
  to = moment(to, 'YYYY-MM-DD').isValid() ? moment(to, 'YYYY-MM-DD') : moment().add(1000000000000);
  
  User.findById(userId).then(user => {
      if (!user) throw new Error('Unknown user with _id');
      User.find({ userId })
          .where('date').gte(from).lte(to)
          .limit(+limit).exec()
          .then(log => {
            var counter = 0;
            for(var prop in user.exercises) {
              counter++;
              /*if (user.exercises.hasOwnProperty(prop)) {
              // or Object.prototype.hasOwnProperty.call(obj, prop)                
              }*/
            }
            res.json({
              Exercise: user.exercises,
              Amount: count
            })
          }
            /*status(200).send({            
              _id: userId,
              username: user.username,
              count: log.length,
              log: log.map(o => ({
                  description: o.description,
                  duration: o.duration,
                  date: moment(o).format('ddd MMMM DD YYYY')
              }))
          })*/)
  })
      .catch(err => {
          console.log(err);
          res.status(500).send(err.message);
      })
})

/*[
  // Exercise validation
 
], (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    errors.array().forEach(e => {
      if((e.value !== undefined && e.param !== 'username') || e.param === 'username'){
        const { param, msg: message, } = errors.array()[0]
        return next({ param, message, })
      }
    })
  }
  const { username, from = new Date(0), to = new Date(), limit = 100 } = req.query;
  User.aggregate([{ $match: { username }},
      { $unwind: '$exercises'},
      { $match: {'exercises.date' : { $gte: new Date(from), $lte: new Date(to)}}},
      { $limit: Number(limit) }
    ])
      .then(doc => {
        res.json(doc);
      })
});*/


//test 2
app.get('/test', (req, res) => {
const {username} = req.query
  User
    .find({username})
    .exec()
    .then(entries => res.json({
      username: `${entries[0]["username"]}`,
      _id: `${entries[0]["_id"]}`
    }
      ))
});

  ///////////////////////////////////////////////////////////
  // Default Route Handler
  ///////////////////////////////////////////////////////////
  app.get('*', (req, res, next) => {
    res.redirect('/')
  });


  ///////////////////////////////////////////////////////////
  // Error Handler
  ///////////////////////////////////////////////////////////
  /* eslint no-unused-vars: 0 */
  app.use((err, req, res, next) => {
    console.error(err)
    res.json({
      success: false,
      error: err.message
    })
  })

} //end module.exports