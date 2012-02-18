define ['lib/jquery/jquery'], ->
  plugin = ($) ->
    $.fn.RectangleBoardEditor = (model) ->
      html = ['<table class="rectangle-board"><tbody>']
      for row in [0...model.rows]
        html.push '<tr>'
        for column in [0...model.columns]
          html.push "<td>#{row},#{column}</td>"
        html.push '</tr>'
      html.push '</tbody></table>'
      $(this).append html.join('')
  plugin jQuery
  null
