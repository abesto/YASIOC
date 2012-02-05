requirejs = require 'requirejs'
requirejs.config {nodeRequire: require}
requirejs [
  'cs!tests/CallCounter.test'
  'cs!tests/boards/RectangleBoard.test'
  'cs!tests/moves/AbsolutePath.test'
], (CallCounter, RectangleBoard, AbsolutePath) ->
  reporter = require('nodeunit').reporters['default']
  reporter.run
    'Test utils':
      CallCounter: CallCounter
    'Models':
      'Boards':
        RectangleBoard: RectangleBoard
      'Moves':
        AbsolutePath: AbsolutePath

