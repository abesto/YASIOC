define ['cs!assets/js/serializer'], (serializer) ->
  class Game
    serialize_boards: -> serializer.serialize @boards
