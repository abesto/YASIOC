define ->
  class AbsolutePath
    constructor: (fields...) ->
      @fields = []
      for field in fields
        if field not in @fields then @fields.push field
        else break
      @__defineGetter__ 'length', -> @fields.length

    isValid: ({from: from, to: to}) ->
      fromIndex = @fields.indexOf from
      toIndex = @fields.indexOf to
      return -1 not in [fromIndex, toIndex] and toIndex > fromIndex

    validMoves: ({from: from, piece: piece}) ->
      {from: from, to: to, piece: piece} for to in @fields[@fields.indexOf(from)+1..]
