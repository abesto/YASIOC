route_files = ['openid', 'edit']

require ("cs!routes/#{f}" for f in route_files), ->
  app.get '/', (req, res) ->
    if not req.session?.user? then res.redirect '/login'
    else res.redirect '/edit'


