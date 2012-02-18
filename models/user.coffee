define ['mongoose'], (mongoose) ->
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
      this.id = user.id
      this.name = user.id

      for prop in nameProperties
        if user[prop]
          @name = user[prop]
          if prop == 'email' then @name = @name.split('@')[0]
          break

  return {
    getAndClearSessionIds: (userId, callback) ->
      User.findById userId, ['sessions'], (err, doc) ->
        if !err && doc
          callback err, Array.clone(doc.sessions)
          doc.sessions = []
          doc.save()
        else
          callback(err, null)

    login: (data, sessionId, callback) ->
      if !data.authenticated then throw 'Pass only authenticated OpenID information to User model!'

      OpenId.findOne {'claimedIdentifier': data.claimedIdentifier}, (err, doc) ->
        if doc is null
          user = new User()
          user[key] = value for key, value of data
          user.sessions.push(sessionId)
          user.save()

          openid = new OpenId()
          openid.claimedIdentifier = data.claimedIdentifier
          openid.userId = user._id
          openid.save()

          callback null, new UserInterface(user)

        else
          openid = doc
          User.findById openid.userId, (err, doc) ->
            user = doc
            user[key] = value for key, value of data
            user.sessions.push(sessionId)
            user.save()
            callback null, new UserInterface(user)

    findById: (id, callback) ->
      User.findById id, (err, doc) ->
        if err then callback err, doc
        else callback null, new UserInterface(doc)
  }
