define ['cs!tests/utils/CallCounter', 'cs!models/moves/AbsolutePath'], (CallCounter, AbsolutePath) ->
  board1D = { field: (i) -> if not @[i] then @[i] = { seq: i } else @[i] }
  board2D = { field: (i,j) -> key = "#{i},#{j}"; if not @[key] then @[key] = { i: i, j: j } else @[key] }

  f0 = board1D.field 0
  f1 = board1D.field 1
  f2 = board1D.field 2
  f00 = board2D.field 0, 0
  f01 = board2D.field 0, 1
  f10 = board2D.field 1, 0
  f11 = board2D.field 1, 1

  fieldsPath1D = [f0, f1, f2]
  fieldsPath2D = [f00, f01, f10, f11]

  path1D = new AbsolutePath fieldsPath1D...
  path2D = new AbsolutePath fieldsPath2D...

  return {
    'Path length is set': (test) ->
      test.expect 2
      test.equal 3, path1D.length
      test.equal 4, path2D.length
      test.done()

    'Only forward fields are valid': (test) ->
      test.expect 9 + 16 + 2
      for from, fromSeq in fieldsPath1D
        for to, toSeq in fieldsPath1D
          test.strictEqual toSeq > fromSeq, path1D.isValid({from: from, to: to, piece: 'P'})

      for from, fromSeq in fieldsPath2D
        for to, toSeq in fieldsPath2D
          test.strictEqual toSeq > fromSeq, path2D.isValid({from: from, to: to, piece: 'P'})

      test.strictEqual false, path1D.isValid({from: f0, to: board1D.field(5)})
      test.strictEqual false, path1D.isValid({from: f00, to: board1D.field(5, 9)})

      test.done()

    'All valid moves are generated (and no invalid moves)': (test) ->
      test.expect 3 + 9 + 4 + 16

      for from, fromSeq in fieldsPath1D
        valid = path1D.validMoves from: from, piece: 'P'
        test.strictEqual 2 - fromSeq, valid.length
        for to, toSeq in fieldsPath1D
          m = {from: from, to: to, piece: 'P'}
          test.strictEqual path1D.isValid(m), ((x for x in valid when x.from == m.from and x.to == m.to and x.piece == m.piece).length > 0)

      for from, fromSeq in fieldsPath2D
        valid = path2D.validMoves from: from, piece: 'P'
        test.strictEqual 3 - fromSeq, valid.length
        for to, toSeq in fieldsPath2D
          m = {from: from, to: to, piece: 'P'}
          test.strictEqual path2D.isValid(m), ((x for x in valid when x.from == m.from and x.to == m.to and x.piece == m.piece).length > 0)

      test.done()

    'Path is truncated before a circle is completed': (test) ->
      test.expect 3
      p = new AbsolutePath f0, f1, f2, f1, f2
      test.equal 3, p.length
      valid = p.validMoves from: f0
      test.equal f1, valid[0].to
      test.equal f2, valid[1].to
      test.done()

  }
