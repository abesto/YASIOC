define ->
  class RectangleField
    constructor: (@board, @row, @column) ->
      @_pieces = []

    addPiece: (piece) -> @_pieces.push piece
    removePiece: (piece) -> @_pieces.splice i, 1 if (i = @_pieces.indexOf(piece)) > -1
    isEmpty: -> @_pieces.length == 0
    getPieces: -> @_pieces

  class RectangleBoard
    constructor: ({rows: @rows, columns: @columns}) ->
      @_fields = {}
      @__defineGetter__ 'fields', -> @rows * @columns

    row: (r) -> {column: (c) => @field(r, c)}
    column: (c) -> {row: (r) => @field(r, c)}

    field: (r, c) ->
      if r < 0 || c < 0 || r >= @rows || c >= @columns then return undefined
      key = "#{r},#{c}"
      if key not of @_fields then @_fields[key] = new RectangleField(this, r, c)
      return @_fields[key]

    serialType: -> 'RectangleBoard'
    serialParams: -> [@row, @column]
    @serialConstructor: (row, column) -> new RectangleField(rows: row, columns: columns)
    

  return RectangleBoard

