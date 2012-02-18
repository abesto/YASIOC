define(function() {
  function filterSelector(nodename, property, fromValue, toValue) {
    if (typeOf(toValue) === 'null') toValue = fromValue;
    var value, selectors = [];
    for (value = fromValue; value <= toValue; value++) {
      selectors.push(nodename + '[' + property + '=' + value + ']');
    }
    return selectors.join(',');
  }

  return new Class({
    Implements: Events,

    initialize: function(rows, columns) {
      this.rows = rows;
      this.columns = columns;
      this.table = null;
    },

    render: function(container) {
      var row, column, rowEl, cellEl;

      if (this.table !== null) this.table.dispose();

      this.table = new Element('table');
      this.table.addClass('board');

      for (row = 0; row < this.rows; row++) {
        rowEl = new Element('tr');
        rowEl.setProperty('row', row);
        for (column = 0; column < this.columns; column++) {
          cellEl = new Element('td');
          cellEl.setProperties({
            row: row,
            column: column
          });
          cellEl.addClass('cell');
          rowEl.grab(cellEl);
        }
        this.table.grab(rowEl);
      }

      container.grab(this.table);
    },

    range: function(fromRow, fromColumn, toRow, toColumn) {
      var columnsSelector = filterSelector('column', fromColumn, toColumn);
      return $$(this.table.getElements( filterSelector('tr', 'row', fromRow, toRow) )
      .getElements(filterSelector('td', 'column', fromColumn, toColumn)).flatten());
    },

    putPiece: function(piece, row, column) {
      var old = $(piece._id), el;

      if (typeOf(old) !== 'null')
        el = old;
      else {
        el = new Element('span');
        el.addClass(piece.color + '-piece');
        el.setProperty('id', piece._id);
        el.set('html', '&#x25CF;');
        el.addEvent('click', function() {
          this.fireEvent('piece-click', piece);
        }.bind(this));
      }

      if (typeOf(row) === 'null') row = piece.row;
      if (typeOf(column) === 'null') column = piece.column;

      this.range(row, column).grab(el);
    },

    isEmpty: function(row, column) {
      return this.range(row, column)[0].get('text').trim().length == 0;
    }
  });

});
