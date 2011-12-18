exports.sio1 = require('./sio1');

exports.index = {
  get: {
    defaultAction: 'index',
    
    index: function(req, res) {
      res.render('index');
    },

    foo: function(req, res) {
      res.render('index');
    }
  }
};
