define(['mongoose'], function(mongoose) {
  require('mootools');

  var
    UserSchema = new mongoose.Schema({
      friendlyName: String,
      fullName: String,
      email: String,
      sessions: [String]
    }),
    User = mongoose.model('User', UserSchema),

    OpenIdSchema = new mongoose.Schema({
      claimedIdentifier: {type: String, unique: true},
      userId: mongoose.Schema.ObjectId
    }),
    OpenId = mongoose.model('OpenId', OpenIdSchema),

    UserInterface = new Class({
      initialize: function(user) {
        var i, nameProperties = ['friendlyName', 'fullName', 'email'], prop;
        this._id = user._id;
        this.name = user._id;

        for (i in nameProperties) {
          prop = nameProperties[i];
          if (user[prop]) {
            this.name = user[prop];
            break;
          }
        }
      }
    });

  return {
    getAndClearSessionIds: function(userId, callback) {
      User.findById(userId, ['sessions'], function(err, doc) {
        if (!err && doc) {
          callback(err, Array.clone(doc.sessions));
          doc.sessions = [];
          doc.save();
        } else {
          callback(err, null);
        }
      })
    },



    login: function(data, sessionId, callback) {
      if (!data.authenticated) {
        throw 'Pass only authorized OpenID information to User model!';
      }

      OpenId.findOne({'claimedIdentifier': data.claimedIdentifier}, function(err, doc) {
        var user, openid;
        if (err) {
          callback(err, null);
          return;
        }

        if (typeOf(doc) === 'null') {
          user = new User();
          Object.each(data, function(value, key) {
            user[key] = value;
          });
          user.sessions.push(sessionId);
          user.save();

          openid = new OpenId();
          openid.claimedIdentifier = data.claimedIdentifier;
          openid.userId = user._id;
          openid.save();

          callback(null, new UserInterface(user));
        } else {
          openid = doc;
          User.findById(openid.userId, function(err, doc) {
            user = doc;
            if (err) {
              callback(err, null);
            } else {
              Object.each(data, function(value, key) {
                if (!user[key]) user[key] = value;
              });
              user.sessions.push(sessionId);
              user.save();
              callback(null, new UserInterface(user));
            }
          });
        }
      });
    }
  }
});