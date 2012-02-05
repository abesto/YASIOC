define ['cs!models/boards/RectangleBoard'], (Board) -> {
  setUp: (callback) ->
    @board = new Board
      rows: 8
      columns: 8
    callback()

  'Number of fields is computed and updated correctly': (test) ->
    test.expect 2
    test.equal 64, @board.fields
    @board.rows = 2
    test.equal 16, @board.fields
    test.done()

  'All fields are accessible and initially empty': (test) ->
    test.expect 2 * @board.fields
    for row in [0 ... @board.rows]
      for column in [0 ... @board.columns]
        test.deepEqual [], @board.field(row, column).getPieces()
        test.ok(@board.field(row, column).isEmpty())
    test.done()

  'Pieces can be added, other fields are unaffected': (test) ->
    test.expect 2
    @board.row(0).column(0).addPiece 'P'
    test.deepEqual ['P'], @board.row(0).column(0).getPieces()
    test.ok @board.row(1).column(0).isEmpty()
    test.done()

  'Pieces can be removed, other fields are unaffected': (test) ->
    test.expect 2
    @board.field(0,0).addPiece(0)
    @board.field(0,0).addPiece(1)
    @board.field(1,1).addPiece(2)
    @board.field(0,0).removePiece(1)
    test.deepEqual [0], @board.field(0,0).getPieces()
    test.deepEqual [2], @board.field(1,1).getPieces()

    test.done()

  'Field can be accessed via both board.field(row, column) and board.row(r).column(c)': (test) ->
    test.expect 1
    @board.row(0).column(1).addPiece 'P'
    test.deepEqual ['P'], @board.field(0, 1).getPieces()
    test.done()

  'Invalid field indices return undefined as field': (test) ->
    test.expect 4
    test.ok typeof @board.field(-1, 0) == 'undefined'
    test.ok typeof @board.field(9, 0) == 'undefined'
    test.ok typeof @board.field(0, -1) == 'undefined'
    test.ok typeof @board.field(0, 9) == 'undefined'
    test.done()
}
