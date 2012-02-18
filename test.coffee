requirejs = require 'requirejs'
requirejs.config {nodeRequire: require}
requirejs [
  'cs!tests/CallCounter.test'
  'cs!tests/Serializer.test'
  'cs!tests/boards/RectangleBoard.test'
  'cs!tests/moves/AbsolutePath.test'
], (CallCounter, Serializer, RectangleBoard, AbsolutePath) ->
  reporter = require('nodeunit').reporters['default']
  reporter.run
    TestUtils:
      CallCounter: CallCounter
    Models:
      Serializer: Serializer
      Boards:
        RectangleBoard: RectangleBoard
      Moves:
        AbsolutePath: AbsolutePath

