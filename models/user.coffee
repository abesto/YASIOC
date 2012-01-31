define ['mongoose', 'mootools'], (mongoose) ->
  UserSchema = new mongoose.Schema
    friendlyName: String,
    fullName: String,
    email: String,
    sessions: [String]
  User = mongoose.model 'User', UserSchema

  OpenIdSchema = new mongoose.Schema
    claimedIdentifier: {type: String, unique: true},
    userId: mongoose.Schema.ObjectId
  OpenId = mongoose.model 'OpenId', OpenIdSchema

  class UserInterface
    constructor: (user) ->
      nameProperties = ['friendlyName', 'fullName', 'email']
      this._id = user._id;
      this.name = user._id;

      for prop in nameProperties
        if user[prop]
          @name = user[prop]
          if prop == 'email' then @name = @name.split('@')[0]
          break

  interface = {}
  interface.getAndClearSessionIds = (userId, callback) ->
      User.findById userId, ['sessions'], (err, doc) ->
        if !err && doc
          callback err, Array.clone(doc.sessions)
          doc.sessions = []
          doc.save()
        else
          callback(err, null)

  interface.login = (data, sessionId, callback) ->
    if !data.authenticated then throw 'Pass only authenticated OpenID information to User model!'

    OpenId.findOne {'claimedIdentifier': data.claimedIdentifier}, (err, doc) ->
      if typeOf(doc) == 'null'
        user = new User()
        user[key] = value for key, value of data
        user.sessions.push(sessionId);
        user.save();

        openid = new OpenId();
        openid.claimedIdentifier = data.claimedIdentifier;
        openid.userId = user._id;
        openid.save();

        callback null, new UserInterface(user)

      else
        openid = doc
        User.findById openid.userId, (err, doc) ->
          user = doc
          user[key] = value for key, value of data
          user.sessions.push(sessionId);
          user.save();
          callback null, new UserInterface(user)

  return interface
