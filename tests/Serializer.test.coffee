define ['cs!models/Serializer'], (S) ->
  class FakeObj
    constructor: (@params...) ->
    serialType: -> 'Fake'
    serialClass: -> 'FakeObj'
    serialData: -> @params.join(',')
    @unserialize: (string) -> new FakeObj (part for part in string.split(',') when part.length > 0)...

  global.FakeObj = FakeObj

  return {
    'Empty string <-> null': (test) ->
      test.expect 2
      S.unserialize '', (err, ret) ->
        test.strictEqual null, ret
      S.serialize null, (err, ret) ->
        test.strictEqual '', ret
      test.done()

    'Undefined -> empty string': (test) ->
      test.expect 1
      S.serialize undefined, (err, ret) ->
        test.strictEqual '', ret
      test.done()

    'One object with and one without data': (test) ->
      test.expect 2
      for before in [new FakeObj(), new FakeObj('a')]
        S.serialize before, (err, serial) ->
          S.unserialize serial, (err, after) ->
            test.deepEqual before.params, after.params
      test.done()

    'Multiple objects, with and without data': (test) ->
      test.expect 2
      input = [new FakeObj(), new FakeObj('a')]
      S.serialize input, (err, serial) ->
        S.unserialize serial, (err, output) ->
          test.deepEqual input[0].params, output[0].params
          test.deepEqual input[1].params, output[1].params
      test.done()
  }
  
