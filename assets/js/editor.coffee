define ['serializer', 'boards/RectangleBoard', 'order!lib/jquery/jquery', 'order!lib/jquery/bootstrap-tab', 'order!lib/jquery/bootstrap-dropdown', 'order!lib/jquery/bootstrap-alert', 'editor/RectangleBoard'], (serializer, RectangleBoard) ->
  gameId = $('#game-id').text()

  $alerts = $('#alerts')
  alert = (msgStrong, msgNormal='', env='', timeout=null) ->
    $alert = $("<div class=\"alert #{env}\"><a class=\"close\" data-dismiss=\"alert\" href=\"#\">&times;</a><strong>#{msgStrong}</strong><br>#{msgNormal}</div>")
    $alerts.append $alert
    if timeout isnt null then setTimeout (-> $alert.alert('close')), timeout

  $ ->
    $('#game-save').click ->
      $.ajax
      type: 'PUT'
      url: '/edit/' + gameId
      data:
        name: $('#game input[name=name]').val()
        description: $('#game textarea[name=description]').val()
          .done(() -> alert 'Changes saved', 'Game name, description', 'alert-success', 3000)
          .fail((data) -> alert 'Error', data.responseText, 'alert-error')

    $('#boards-pill').on 'shown', ->
      $.getJSON '/edit/boards/' + gameId, (data) ->
        $('#boards').html serializer.unserialize data

    $('#add-rectangle-board').click ->
      b = new RectangleBoard
        rows: 8
        columns: 8
      $('#boards-list').RectangleBoardEditor b
