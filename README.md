# bitbite

import React, { useEffect, useState } from 'react';

// Crypto Management Dashboard (single-file React component)
// - TailwindCSS classes used for styling (no import required in this file)
// - Uses CoinGecko public API for live prices
// - Stores portfolio in localStorage
// - Uses basic charts via recharts (install as dependency)
//
// How to use:
// 1) Create a React app (Vite / CRA / Next). Ensure TailwindCSS is configured.
// 2) Install dependencies: `npm install recharts`
// 3) Drop this file into your components and import it into a page.
// 4) Run the app.

export default function CryptoDashboard() {
  const [coins, setCoins] = useState([]); // coin list (from CoinGecko)
  const [portfolio, setPortfolio] = useState([]); // {id, symbol, name, qty, buyPrice}
  const [query, setQuery] = useState('');
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // load portfolio from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('crypto_portfolio_v1');
      if (saved) setPortfolio(JSON.parse(saved));
    } catch (e) {
      console.warn('Could not load saved portfolio', e);
    }
  }, []);

  // save portfolio when it changes
  useEffect(() => {
    localStorage.setItem('crypto_portfolio_v1', JSON.stringify(portfolio));
  }, [portfolio]);

  // fetch top coins (market data)
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);
    fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false'
    )
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        setCoins(data);
      })
      .catch((e) => setError('Failed to load coin data'))
      .finally(() => setIsLoading(false));
    return () => (mounted = false);
  }, []);

  // helper: find coin by id or symbol
  const findCoin = (input) => {
    const q = input.trim().toLowerCase();
    return (
      coins.find((c) => c.id === q || c.symbol === q || c.name.toLowerCase() === q) ||
      coins.find((c) => c.symbol === q.replace(/^\$/,''))
    );
  };

  // add position
  const addPosition = ({ id, qty, buyPrice }) => {
    if (!id || !qty) return;
    const coin = coins.find((c) => c.id === id) || findCoin(id);
    if (!coin) {
      setError('Coin not found. Try searching by symbol (eg. btc) or coin id (eg. bitcoin)');
      return;
    }
    const existing = portfolio.find((p) => p.id === coin.id);
    if (existing) {
      const updated = portfolio.map((p) =>
        p.id === coin.id
          ? { ...p, qty: Number(p.qty) + Number(qty), buyPrice: Number(((p.buyPrice * p.qty) + (buyPrice * qty)) / (p.qty + qty)).toFixed(2) }
          : p
      );
      setPortfolio(updated);
    } else {
      setPortfolio((p) => [...p, { id: coin.id, symbol: coin.symbol, name: coin.name, qty: Number(qty), buyPrice: Number(buyPrice) }]);
    }
    setSelectedCoin(null);
    setQuery('');
  };

  // remove position
  const removePosition = (id) => {
    setPortfolio((p) => p.filter((x) => x.id !== id));
  };

  // compute live portfolio with current prices
  const livePortfolio = portfolio.map((pos) => {
    const coin = coins.find((c) => c.id === pos.id);
    const currentPrice = coin ? coin.current_price : 0;
    const value = Number((currentPrice * pos.qty).toFixed(2));
    const cost = Number((pos.buyPrice * pos.qty).toFixed(2));
    const pnl = Number((value - cost).toFixed(2));
    const pnlPct = cost ? Number(((pnl / cost) * 100).toFixed(2)) : 0;
    return { ...pos, currentPrice, value, cost, pnl, pnlPct, image: coin?.image };
  });

  const totalValue = livePortfolio.reduce((s, p) => s + p.value, 0);
  const totalCost = livePortfolio.reduce((s, p) => s + p.cost, 0);
  const totalPnl = Number((totalValue - totalCost).toFixed(2));
  const totalPnlPct = totalCost ? Number(((totalPnl / totalCost) * 100).toFixed(2)) : 0;

  // UI bits: quick search + add
  const SearchAdd = () => {
    const [qty, setQty] = useState('');
    const [buyPrice, setBuyPrice] = useState('');

    const handleAdd = () => {
      if (!selectedCoin) {
        const coin = findCoin(query);
        if (!coin) { setError('Coin not found'); return; }
        addPosition({ id: coin.id, qty: Number(qty), buyPrice: Number(buyPrice || coin.current_price) });
      } else {
        addPosition({ id: selectedCoin.id, qty: Number(qty), buyPrice: Number(buyPrice || selectedCoin.current_price) });
      }
      setQty('');
      setBuyPrice('');
    };

    return (
      <div className="p-4 bg-white/80 backdrop-blur rounded-2xl shadow-md">
        <h3 className="text-lg font-semibold mb-2">Add Position</h3>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setError(null); setSelectedCoin(null); }}
            placeholder="Search by name or symbol (eg. bitcoin or btc)"
            className="flex-1 input input-bordered"
          />
          <button
            onClick={() => {
              const coin = findCoin(query);
              if (coin) setSelectedCoin(coin);
              else setError('Could not find coin');
            }}
            className="btn"
          >
            Pick
          </button>
        </div>

        {selectedCoin && (
          <div className="mt-3 flex items-center gap-3">
            <img src={selectedCoin.image} alt="icon" className="w-8 h-8 rounded-full" />
            <div>
              <div className="font-medium">{selectedCoin.name} ({selectedCoin.symbol.toUpperCase()})</div>
              <div className="text-sm text-muted">Price: ${selectedCoin.current_price}</div>
            </div>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Quantity (eg. 0.5)" className="input input-bordered" />
          <input value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="Buy Price (USD) - optional" className="input input-bordered" />
        </div>

        <div className="mt-3 flex gap-2">
          <button className="btn btn-primary" onClick={handleAdd}>Add to Portfolio</button>
          <button className="btn" onClick={() => { setSelectedCoin(null); setQuery(''); }}>Clear</button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white/5 p-6 rounded-3xl">
          <header className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">Crypto Manager</h1>
              <p className="text-sm text-slate-300">Portfolio snapshot & quick management</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">Total Value</div>
              <div className="text-xl font-semibold">${totalValue.toLocaleString()}</div>
              <div className={`text-sm ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{totalPnl >= 0 ? '+' : ''}${totalPnl} ({totalPnlPct}%)</div>
            </div>
          </header>

          <main className="mt-6 space-y-4">
            {isLoading && <div className="p-4 bg-white/3 rounded">Loading market data...</div>}
            {error && <div className="p-3 bg-rose-900/40 rounded">{error}</div>}

            <section>
              <h2 className="text-lg font-medium mb-2">Holdings</h2>
              <div className="space-y-3">
                {livePortfolio.length === 0 && <div className="p-4 bg-white/3 rounded">No positions yet — add one on the right.</div>}

                {livePortfolio.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-white/3 rounded">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt="icon" className="w-10 h-10 rounded-full" />
                      <div>
                        <div className="font-medium">{p.name} <span className="text-sm text-slate-300">{p.symbol.toUpperCase()}</span></div>
                        <div className="text-sm text-slate-400">Qty: {p.qty} • Avg Buy: ${p.buyPrice}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-medium">${p.value.toLocaleString()}</div>
                      <div className={`text-sm ${p.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{p.pnl >= 0 ? '+' : ''}${p.pnl} ({p.pnlPct}%)</div>
                      <div className="mt-2 flex gap-2 justify-end">
                        <button className="btn btn-sm" onClick={() => navigator.clipboard?.writeText(p.id)}>Copy ID</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => removePosition(p.id)}>Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-medium mb-2">Market Movers (Top 10)</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {coins.slice(0, 10).map((c) => (
                  <div key={c.id} className="p-2 bg-white/3 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <img src={c.image} className="w-6 h-6 rounded-full" />
                      <div className="font-medium">{c.symbol.toUpperCase()}</div>
                    </div>
                    <div className="text-xs text-slate-300">${c.current_price.toLocaleString()}</div>
                    <div className={`text-xs ${c.price_change_percentage_24h >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{c.price_change_percentage_24h?.toFixed(2)}%</div>
                  </div>
                ))}
              </div>
            </section>

          </main>
        </div>

        <aside className="space-y-4">
          <SearchAdd />

          <div className="p-4 bg-white/5 rounded-2xl">
            <h3 className="font-semibold">Quick Actions</h3>
            <div className="mt-2 grid gap-2">
              <button className="btn" onClick={() => { localStorage.removeItem('crypto_portfolio_v1'); setPortfolio([]); }}>Reset Portfolio</button>
              <button className="btn btn-ghost" onClick={() => window.location.reload()}>Refresh Prices</button>
            </div>
          </div>

          <div className="p-4 bg-white/5 rounded-2xl text-sm">
            <div className="font-medium">Tips</div>
            <ul className="mt-2 list-disc list-inside text-slate-300">
              <li>Use coin id (eg. bitcoin) or symbol (eg. btc) when adding.</li>
              <li>Buy price optional — if omitted current price used.</li>
              <li>Data loads from CoinGecko public API.</li>
            </ul>
          </div>
        </aside>
      </div>

      <footer className="max-w-6xl mx-auto mt-8 text-center text-slate-400 text-sm">Made with ❤️ — simple local portfolio manager (no trading). Data from CoinGecko.</footer>
    </div>
  );
}

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://bitbite.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c3959481-745b-4038-b15a-1686d95e0625).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `project-completion-assistance-be28a` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
