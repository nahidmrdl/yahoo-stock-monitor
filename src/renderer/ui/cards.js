(function () {
  const { els } = window.StockMonitor.dom;
  const { formatChange, formatPrice, formatTime } = window.StockMonitor.formatting;
  const chartUi = window.StockMonitor.charts;

  const latestStocks = new Map();
  let draggedSymbol = null;

  function setEmptyState(symbols) {
    els.emptyState.classList.toggle('hidden', symbols.length > 0);
  }

  function updateCard(stock) {
    latestStocks.set(stock.symbol, stock);

    const card = els.cards.querySelector(`[data-symbol="${CSS.escape(stock.symbol)}"]`);
    if (!card) return;

    const price = card.querySelector('.price');
    const currency = card.querySelector('.currency');
    const name = card.querySelector('.name');
    const changePill = card.querySelector('.change-pill');
    const meta = card.querySelector('.meta');
    const error = card.querySelector('.error');

    name.textContent = stock.name || stock.symbol;
    price.textContent = formatPrice(stock.price);
    currency.textContent = stock.currency || '';

    changePill.textContent = formatChange(stock.change, stock.changePercent);
    changePill.classList.remove('positive', 'negative');

    if (typeof stock.change === 'number') {
      changePill.classList.add(stock.change >= 0 ? 'positive' : 'negative');
    }

    meta.textContent = [stock.marketState, formatTime(stock.marketTime)].filter(Boolean).join(' / ');

    if (stock.error) {
      error.textContent = stock.error;
      error.classList.remove('hidden');
    } else {
      error.textContent = '';
      error.classList.add('hidden');
    }
  }

  function removeCachedStock(symbol) {
    latestStocks.delete(symbol);
  }

  function renderCards({
    symbols,
    visibleSymbols,
    viewMode,
    focusedSymbol,
    onRemove,
    onMove,
    onMoveBefore,
    onCreateWidget,
    onFocus
  }) {
    els.cards.innerHTML = '';
    chartUi.destroyAll();

    visibleSymbols.forEach((symbol) => {
      const globalIndex = symbols.indexOf(symbol);
      const node = els.template.content.firstElementChild.cloneNode(true);

      node.dataset.symbol = symbol;
      node.querySelector('.symbol').textContent = symbol;

      if (viewMode === 'widget' && focusedSymbol === symbol) {
        node.classList.add('focused-card');
      }

      const moveLeftBtn = node.querySelector('.move-left-btn');
      const moveRightBtn = node.querySelector('.move-right-btn');
      const removeBtn = node.querySelector('.remove-btn');
      const createWidgetBtn = node.querySelector('.create-widget-btn');

      moveLeftBtn.disabled = globalIndex === 0;
      moveRightBtn.disabled = globalIndex === symbols.length - 1;

      removeBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        onRemove(symbol);
      });

      createWidgetBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        onCreateWidget(symbol);
      });

      moveLeftBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        onMove(symbol, -1);
      });

      moveRightBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        onMove(symbol, 1);
      });

      node.addEventListener('click', (event) => {
        if (viewMode !== 'widget' || focusedSymbol || event.target.closest('button')) return;
        onFocus(symbol);
      });

      node.addEventListener('dragstart', (event) => {
        draggedSymbol = symbol;
        node.classList.add('dragging');

        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', symbol);
        }
      });

      node.addEventListener('dragend', () => {
        draggedSymbol = null;

        document.querySelectorAll('.stock-card').forEach((card) => {
          card.classList.remove('dragging', 'drag-over');
        });
      });

      node.addEventListener('dragover', (event) => {
        event.preventDefault();

        if (draggedSymbol && draggedSymbol !== symbol) {
          node.classList.add('drag-over');
        }
      });

      node.addEventListener('dragleave', () => {
        node.classList.remove('drag-over');
      });

      node.addEventListener('drop', (event) => {
        event.preventDefault();
        node.classList.remove('drag-over');

        const fromSymbol = draggedSymbol || event.dataTransfer?.getData('text/plain');
        if (!fromSymbol || fromSymbol === symbol) return;

        onMoveBefore(fromSymbol, symbol);
      });

      els.cards.appendChild(node);
      chartUi.createChart(symbol, node.querySelector('canvas'), {
        focused: viewMode === 'widget' && focusedSymbol === symbol
      });

      const stock = latestStocks.get(symbol);
      if (stock) updateCard(stock);
    });

    setEmptyState(symbols);
  }

  window.StockMonitor.cards = {
    removeCachedStock,
    renderCards,
    updateCard
  };
})();
