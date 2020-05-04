'use strict';

//  ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const { ExchangeError, InvalidOrder, InsufficientFunds, AuthenticationError } = require ('./base/errors');

//  ---------------------------------------------------------------------------

module.exports = class qtrade extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'qtrade',
            'name': 'qTrade',
            'countries': [ 'US' ],
            'rateLimit': 1000,
            'version': 'v1',
            'urls': {
                'logo': 'https://qtrade.io/images/logo.png',
                'api': 'https://api.qtrade.io',
                'www': 'https://qtrade.io',
                'doc': 'https://qtrade-exchange.github.io/qtrade-docs',
            },
            'has': {
                'fetchTrades': true,
                'fetchTicker': true,
                'fetchTickers': true,
                'fetchMarkets': true,
                'fetchCurrencies': true,
                'fetchBalance': true,
                'fetchOrderBook': true,
                'fetchOrder': true,
                'fetchOrders': true,
                'fetchMyTrades': true,
                'fetchClosedOrders': true,
                'fetchOpenOrders': true,
                'fetchOHLCV': true,
                'createOrder': true,
                'cancelOrder': true,
                'createMarketOrder': false,
                'withdraw': true,
            },
            'timeframes': {
                '5m': 'fivemin',
                '15m': 'fifteenmin',
                '30m': 'thirtymin',
                '1h': 'onehour',
                '2h': 'twohour',
                '4h': 'fourhour',
                '1d': 'oneday',
            },
            'api': {
                'public': {
                    'get': [
                        'ticker/{market_string}',
                        'tickers',
                        'currency/{code}',
                        'currencies',
                        'common',
                        'market/{market_string}',
                        'markets',
                        'market/{market_string}/trades',
                        'orderbook/{market_string}',
                        'market/{market_string}/ohlcv/{interval}',
                    ],
                },
                'private': {
                    'get': [
                        'me',
                        'balances',
                        'balances_all', // undocumented
                        'market/{market_string}',
                        'orders',
                        'order/{order_id}',
                        'trades',
                        'withdraw/{withdraw_id}',
                        'withdraws',
                        'deposit/{deposit_id}',
                        'deposits',
                        'transfers',
                    ],
                    'post': [
                        'cancel_order',
                        'withdraw',
                        'deposit_address/{currency}',
                        'sell_limit',
                        'buy_limit',
                    ],
                },
            },
            'fees': {
                'trading': {
                    'tierBased': true,
                    'percentage': true,
                    'taker': 0.0025,
                    'maker': 0.0,
                },
                'funding': {
                    'withdraw': {},
                },
            },
            'exceptions': {
                'exact': {
                    'invalid_auth': AuthenticationError,
                    'insuff_funds': InsufficientFunds,
                },
            },
        });
    }

    async fetchMarkets (params = {}) {
        const response = await this.publicGetMarkets (params);
        //
        //     {
        //         "data":{
        //             "markets":[
        //                 {
        //                     "id":5,
        //                     "market_currency":"BAC",
        //                     "base_currency":"BTC",
        //                     "maker_fee":"0.0025",
        //                     "taker_fee":"0.0025",
        //                     "metadata":{
        //                         "delisting_date":"7/15/2018",
        //                         "market_notices":[
        //                             {
        //                                 "message":"Delisting Notice: This market has been delisted due to low volume. Please cancel your orders and withdraw your funds by 7/15/2018.",
        //                                 "type":"warning"
        //                             }
        //                         ]
        //                     },
        //                     "can_trade":false,
        //                     "can_cancel":true,
        //                     "can_view":false,
        //                     "market_string":"BAC_BTC",
        //                     "minimum_sell_amount":"0.0001",
        //                     "minimum_buy_value":"0.0001",
        //                     "market_precision":8,
        //                     "base_precision":8
        //                 },
        //             ],
        //         }
        //     }
        //
        const data = this.safeValue (response, 'data', {});
        const markets = this.safeValue (data, 'markets', []);
        const result = [];
        for (let i = 0; i < markets.length; i++) {
            const market = markets[i];
            const marketId = this.safeString (market, 'market_string');
            const numericId = this.safeInteger (market, 'id');
            const baseId = this.safeString (market, 'market_currency');
            const quoteId = this.safeString (market, 'base_currency');
            const base = this.safeCurrencyCode (baseId);
            const quote = this.safeCurrencyCode (quoteId);
            const symbol = base + '/' + quote;
            const precision = {
                'amount': this.safeInteger (market, 'market_precision'),
                'price': this.safeInteger (market, 'base_precision'),
            };
            const canView = this.safeValue (market, 'can_view', false);
            const canTrade = this.safeValue (market, 'can_trade', false);
            const active = canTrade && canView;
            result.push ({
                'symbol': symbol,
                'id': marketId,
                'numericId': numericId,
                'baseId': baseId,
                'quoteId': quoteId,
                'base': base,
                'quote': quote,
                'active': active,
                'precision': precision,
                'taker': this.safeFloat (market, 'taker_fee'),
                'maker': this.safeFloat (market, 'maker_fee'),
                'limits': {
                    'amount': {
                        'min': this.safeFloat (market, 'minimum_buy_value'),
                        'max': undefined,
                    },
                    'price': {
                        'min': undefined,
                        'max': undefined,
                    },
                    'cost': {
                        'min': undefined,
                        'max': undefined,
                    },
                },
                'info': market,
            });
        }
        return result;
    }

    async fetchCurrencies (params = {}) {
        const response = await this.publicGetCurrencies (params);
        //
        //     {
        //         "data":{
        //             "currencies":[
        //                 {
        //                     "code":"DGB",
        //                     "long_name":"Digibyte",
        //                     "type":"bitcoin_like",
        //                     "precision":8,
        //                     "config":{
        //                         "price":0.0035,
        //                         "withdraw_fee":"10",
        //                         "deposit_types":[
        //                             {
        //                                 "label":"Address",
        //                                 "lookup_mode":"address",
        //                                 "render_type":"address",
        //                                 "deposit_type":"address",
        //                                 "lookup_config":{}
        //                             }
        //                         ],
        //                         "default_signer":103,
        //                         "address_version":30,
        //                         "satoshi_per_byte":300,
        //                         "required_confirmations":200,
        //                         "required_generate_confirmations":300
        //                     },
        //                     "metadata":{},
        //                     "minimum_order":"0.0001",
        //                     "status":"ok",
        //                     "can_withdraw":true,
        //                     "delisted":false,
        //                     "deposit_disabled":false,
        //                     "withdraw_disabled":false,
        //                     "deposit_warn_codes":[],
        //                     "withdraw_warn_codes":[]
        //                 },
        //             ],
        //         }
        //     }
        //
        const data = this.safeValue (response, 'data', {});
        const currencies = this.safeValue (data, 'currencies', []);
        const result = {};
        for (let i = 0; i < currencies.length; i++) {
            const currency = currencies[i];
            const id = this.safeString (currency, 'code');
            const code = this.safeCurrencyCode (id);
            const name = this.safeString (currency, 'long_name');
            const type = this.safeString (currency, 'type');
            const canWithdraw = this.safeString (currency, 'can_withdraw');
            const config = this.safeValue (currency, 'config', {});
            const status = this.safeString (currency, 'status');
            const active = canWithdraw && (status === 'ok');
            result[code] = {
                'id': id,
                'code': code,
                'info': currency,
                'type': type,
                'name': name,
                'fee': this.safeFloat (config, 'withdraw_fee'),
                'precision': this.safeInteger (currency, 'precision'),
                'active': active,
                'limits': {
                    'amount': {
                        'min': this.safeFloat (currency, 'minimum_order'),
                        'max': undefined,
                    },
                    'price': {
                        'min': undefined,
                        'max': undefined,
                    },
                    'cost': {
                        'min': undefined,
                        'max': undefined,
                    },
                    'withdraw': {
                        'min': undefined,
                        'max': undefined,
                    },
                },
            };
        }
        return result;
    }

    parseOHLCV (ohlcv, market = undefined, timeframe = '5m', since = undefined, limit = undefined) {
        //
        //     {
        //         "time":"2019-12-07T22:55:00Z",
        //         "open":"0.00197",
        //         "high":"0.00197",
        //         "low":"0.00197",
        //         "close":"0.00197",
        //         "volume":"0.00016676",
        //         "market_volume":"0.08465047"
        //     }
        //
        const result = [
            this.parse8601 (this.safeString (ohlcv, 'time')),
            this.safeFloat (ohlcv, 'open'),
            this.safeFloat (ohlcv, 'high'),
            this.safeFloat (ohlcv, 'low'),
            this.safeFloat (ohlcv, 'close'),
            this.safeFloat (ohlcv, 'volume'),
        ];
        return result;
    }

    async fetchOHLCV (symbol, timeframe = '5m', since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'market_string': market['id'],
            'interval': this.timeframes[timeframe],
        };
        const response = await this.publicGetMarketMarketStringOhlcvInterval (this.extend (request, params));
        //
        //     {
        //         "data":{
        //             "slices":[
        //                 {"time":"2019-12-07T22:55:00Z","open":"0.00197","high":"0.00197","low":"0.00197","close":"0.00197","volume":"0.00016676","market_volume":"0.08465047"},
        //                 {"time":"2019-12-07T23:00:00Z","open":"0.00197","high":"0.00197","low":"0.00197","close":"0.00197","volume":"0","market_volume":"0"},
        //                 {"time":"2019-12-07T23:05:00Z","open":"0.00197","high":"0.00197","low":"0.00197","close":"0.00197","volume":"0","market_volume":"0"},
        //             ]
        //         }
        //     }
        //
        const data = this.safeValue (response, 'data', {});
        const ohlcvs = this.safeValue (data, 'slices', []);
        return this.parseOHLCVs (ohlcvs, market, timeframe, since, limit);
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        await this.loadMarkets ();
        const marketId = this.marketId (symbol);
        const request = { 'market_string': marketId };
        const response = await this.publicGetOrderbookMarketString (this.extend (request, params));
        //
        //     {
        //         "data":{
        //             "buy":{
        //                 "0.00700015":"4.76196367",
        //                 "0.00700017":"1.89755391",
        //                 "0.00700018":"2.13214088",
        //             },
        //             "last_change":1588539869958811,
        //             "sell":{
        //                 "0.02418662":"0.19513696",
        //                 "0.02465627":"0.2439212",
        //                 "0.02530277":"0.663475931274359255",
        //             }
        //         }
        //     }
        //
        const data = this.safeValue (response, 'data', {});
        const orderbook = {};
        const sides = { 'buy': 'bids', 'sell': 'asks' };
        const keys = Object.keys (sides);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const side = sides[key];
            const bidasks = this.safeValue (data, key, {});
            const prices = Object.keys (bidasks);
            const result = [];
            for (let j = 0; j < prices.length; j++) {
                const priceAsString = prices[j];
                const price = this.safeFloat (prices, j);
                const amount = this.safeFloat (bidasks, priceAsString);
                result.push ([ price, amount ]);
            }
            orderbook[side] = result;
        }
        const timestamp = this.safeIntegerProduct (data, 'last_change', 0.001);
        return this.parseOrderBook (orderbook, timestamp);
    }

    parseTicker (ticker, market = undefined) {
        //
        // fetchTicker, fetchTickers
        //
        //     {
        //         "ask":"0.02423119",
        //         "bid":"0.0230939",
        //         "day_avg_price":"0.0247031874349301",
        //         "day_change":"-0.0237543162270376",
        //         "day_high":"0.02470552",
        //         "day_low":"0.02470172",
        //         "day_open":"0.02530277",
        //         "day_volume_base":"0.00268074",
        //         "day_volume_market":"0.10851798",
        //         "id":41,
        //         "id_hr":"ETH_BTC",
        //         "last":"0.02470172",
        //         "last_change":1588533365354609
        //     }
        //
        let symbol = undefined;
        const marketId = this.safeString (ticker, 'id_hr');
        if (marketId !== undefined) {
            if (marketId in this.markets_by_id) {
                market = this.markets_by_id[marketId];
            } else {
                const [ baseId, quoteId ] = marketId.split ('_');
                const base = this.safeCurrencyCode (baseId);
                const quote = this.safeCurrencyCode (quoteId);
                symbol = quote + '/' + base;
            }
        }
        if ((symbol === undefined) && (market !== undefined)) {
            symbol = market['symbol'];
        }
        const timestamp = this.safeIntegerProduct (ticker, 'last_change', 0.001);
        const previous = this.safeFloat (ticker, 'day_open');
        const last = this.safeFloat (ticker, 'last');
        const day_change = this.safeFloat (ticker, 'day_change');
        let percentage = undefined;
        let change = undefined;
        let average = this.safeFloat (ticker, 'day_avg_price');
        if (day_change !== undefined) {
            percentage = day_change * 100;
            if (previous !== undefined) {
                change = day_change * previous;
            }
        }
        if ((average === undefined) && (last !== undefined) && (previous !== undefined)) {
            average = this.sum (last, previous) / 2;
        }
        const baseVolume = this.safeFloat (ticker, 'day_volume_market');
        const quoteVolume = this.safeFloat (ticker, 'day_volume_base');
        let vwap = undefined;
        if ((baseVolume !== undefined) && (quoteVolume !== undefined) && (baseVolume > 0)) {
            vwap = quoteVolume / baseVolume;
        }
        return {
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': this.safeFloat (ticker, 'day_high'),
            'low': this.safeFloat (ticker, 'day_low'),
            'bid': this.safeFloat (ticker, 'bid'),
            'bidVolume': undefined,
            'ask': this.safeFloat (ticker, 'ask'),
            'askVolume': undefined,
            'vwap': vwap,
            'open': previous,
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': change,
            'percentage': percentage,
            'average': average,
            'baseVolume': baseVolume,
            'quoteVolume': quoteVolume,
            'info': ticker,
        };
    }

    async fetchTickers (symbols = undefined, params = {}) {
        await this.loadMarkets ();
        const response = await this.publicGetTickers (params);
        //
        //     {
        //         "data":{
        //             "markets":[
        //                 {
        //                     "ask":"0.0000003",
        //                     "bid":"0.00000029",
        //                     "day_avg_price":"0.0000002999979728",
        //                     "day_change":"0.0344827586206897",
        //                     "day_high":"0.0000003",
        //                     "day_low":"0.0000003",
        //                     "day_open":"0.00000029",
        //                     "day_volume_base":"0.00591958",
        //                     "day_volume_market":"19732.06666665",
        //                     "id":36,
        //                     "id_hr":"DOGE_BTC",
        //                     "last":"0.0000003",
        //                     "last_change":1588534202130778
        //                 },
        //             ]
        //         }
        //     }
        //
        const data = this.safeValue (response, 'data', {});
        const tickers = this.safeValue (data, 'markets', []);
        const result = {};
        for (let i = 0; i < tickers.length; i++) {
            const ticker = this.parseTicker (tickers[i]);
            const symbol = ticker['symbol'];
            result[symbol] = ticker;
        }
        return this.filterByArray (result, 'symbol', symbols);
    }

    async fetchTicker (symbol, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'market_string': market['id'],
        };
        const response = await this.publicGetTickerMarketString (this.extend (request, params));
        //
        //     {
        //         "data":{
        //             "ask":"0.02423119",
        //             "bid":"0.0230939",
        //             "day_avg_price":"0.0247031874349301",
        //             "day_change":"-0.0237543162270376",
        //             "day_high":"0.02470552",
        //             "day_low":"0.02470172",
        //             "day_open":"0.02530277",
        //             "day_volume_base":"0.00268074",
        //             "day_volume_market":"0.10851798",
        //             "id":41,
        //             "id_hr":"ETH_BTC",
        //             "last":"0.02470172",
        //             "last_change":1588533365354609
        //         }
        //     }
        //
        const data = this.safeValue (response, 'data', {});
        return this.parseTicker (data, market);
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'market_string': market['id'],
            // 'older_than': 123, // returns trades with id < older_than
            // 'newer_than': 123, // returns trades with id > newer_than
        };
        const response = await this.publicGetMarketMarketStringTrades (this.extend (request, params));
        //
        //     {
        //         "data":{
        //             "trades":[
        //                 {
        //                     "id":85507,
        //                     "amount":"0.09390502",
        //                     "price":"0.02556325",
        //                     "base_volume":"0.00240051",
        //                     "seller_taker":true,
        //                     "side":"sell",
        //                     "created_at":"0001-01-01T00:00:00Z",
        //                     "created_at_ts":1581560391338718
        //                 },
        //             ]
        //         }
        //     }
        //
        const data = this.safeValue (response, 'data', {});
        const trades = this.safeValue (data, 'trades', []);
        return this.parseTrades (trades, market, since, limit);
    }

    async fetchMyTrades (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const response = await this.privateGetTrades ();
        return this.parseTrades (response['data']['trades'], market, since, limit);
    }

    parseTrade (trade, market = undefined) {
        //
        // fetchTrades (public)
        //
        //     {
        //         "id":85507,
        //         "amount":"0.09390502",
        //         "price":"0.02556325",
        //         "base_volume":"0.00240051",
        //         "seller_taker":true,
        //         "side":"sell",
        //         "created_at":"0001-01-01T00:00:00Z",
        //         "created_at_ts":1581560391338718
        //     }
        //
        const id = this.safeString (trade, 'id');
        const timestamp = this.safeIntegerProduct (trade, 'created_at_ts', 0.001);
        const orderId = this.safeString (trade, 'order_id');
        const side = this.safeString (trade, 'side');
        let symbol = undefined;
        const marketId = this.safeString (trade, 'symbol');
        if (marketId !== undefined) {
            if (marketId in this.markets_by_id) {
                market = this.markets_by_id[marketId];
            } else {
                const [ baseId, quoteId ] = marketId.split ('_');
                const base = this.safeCurrencyCode (baseId);
                const quote = this.safeCurrencyCode (quoteId);
                symbol = quote + '/' + base;
            }
        }
        if ((symbol === undefined) && (market !== undefined)) {
            symbol = market['symbol'];
        }
        let cost = this.safeFloat (trade, 'base_volume');
        const price = this.safeFloat (trade, 'price');
        const amount = this.safeFloat2 (trade, 'market_amount', 'amount');
        if ((cost === undefined) && (amount !== undefined) && (price !== undefined)) {
            if (price !== undefined) {
                cost = price * amount;
            }
        }
        const result = {
            'id': id,
            'info': trade,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': symbol,
            'order': orderId,
            'type': undefined,
            'side': side,
            'takerOrMaker': undefined,
            'price': price,
            'amount': amount,
            'cost': cost,
            'fee': undefined,
        };
        return result;
    }

    async fetchBalance (params = {}) {
        await this.loadMarkets ();
        const response = await this.privateGetBalancesAll (params);
        //
        //     {
        //         "data":{
        //             "balances": [
        //                 { "balance": "100000000", "currency": "BCH" },
        //                 { "balance": "99992435.78253015", "currency": "LTC" },
        //                 { "balance": "99927153.76074182", "currency": "BTC" },
        //             ],
        //             "order_balances":[],
        //             "limit_used":0,
        //             "limit_remaining":4000,
        //             "limit":4000
        //         }
        //     }
        //
        const data = this.safeValue (response, 'data', {});
        let balances = this.safeValue (data, 'balances', []);
        const result = {
            'info': response,
        };
        for (let i = 0; i < balances.length; i++) {
            const balance = balances[i];
            const currencyId = this.safeString (balance, 'currency');
            const code = this.safeCurrencyCode (currencyId);
            const account = (code in result) ? result[code] : this.account ();
            account['free'] = this.safeFloat (balance, 'balance');
            result[code] = account;
        }
        balances = this.safeValue (data, 'order_balances', []);
        for (let i = 0; i < balances.length; i++) {
            const balance = balances[i];
            const currencyId = this.safeString (balance, 'currency');
            const code = this.safeCurrencyCode (currencyId);
            const account = (code in result) ? result[code] : this.account ();
            account['used'] = this.safeFloat (balance, 'balance');
            result[code] = account;
        }
        return this.parseBalance (result);
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}) {
        if (type !== 'limit') {
            throw new InvalidOrder (this.id + ' createOrder() allows limit orders only');
        }
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'amount': this.amountToPrecision (symbol, amount),
            'market_id': market['numericId'],
            'price': this.priceToPrecision (symbol, price),
        };
        const method = (side === 'sell') ? 'privatePostSellLimit' : 'privatePostBuyLimit';
        const response = await this[method] (this.extend (request, params));
        const data = this.safeValue (response, 'data', {});
        const order = this.safeValue (data, 'order', {});
        return this.parseOrder (order, market);
    }

    parseOrder (order) {
        const result = { 'info': order };
        result['id'] = this.safeString (order, 'id');
        result['datetime'] = this.safeString (order, 'created_at');
        result['timestamp'] = this.parse8601 (result['datetime']);
        if (order['open'] === true) {
            result['status'] = 'open';
        } else {
            result['status'] = 'closed';
        }
        const t = this.safeValue (order, 'trades');
        if (t !== undefined) {
            let side = undefined;
            if (order['order_type'] === 'buy_limit') {
                side = 'buy';
            } else if (order['order_type'] === 'sell_limit') {
                side = 'sell';
            }
            for (let i = 0; i < order['trades'].length; i++) {
                order['trades'][i]['side'] = side;
            }
            result['trades'] = this.parseTrades (order['trades']);
            result['lastTradeTimestamp'] = result['trades'][0]['timestamp'];
        } else {
            result['trades'] = {};
            result['lastTradeTimestamp'] = undefined;
        }
        result['price'] = this.safeFloat (order, 'price');
        result['amount'] = this.safeFloat (order, 'market_amount');
        result['remaining'] = this.safeFloat (order, 'market_amount_remaining');
        result['filled'] = result['amount'] - result['remaining'];
        result['cost'] = result['filled'] * result['price'];
        result['fee'] = undefined;
        const market_coin = this.safeString (order, 'market_string').split ('_')[0];
        const base_coin = this.safeString (order, 'market_string').split ('_')[1];
        result['symbol'] = market_coin + '/' + base_coin;
        return result;
    }

    async cancelOrder (id, symbol = undefined, params = {}) {
        const request = { 'id': parseInt (id) };
        // successful cancellation returns 200 with no payload
        this.privatePostCancelOrder (this.extend (request, params));
    }

    async fetchOrder (id, symbol = undefined, params = {}) {
        const request = { 'queryParams': { 'order_id': parseInt (id) }};
        const response = await this.privateGetOrderOrderId (this.extend (request, params));
        return this.parseOrder (response['data']['order']);
    }

    async fetchOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        const response = await this.privateGetOrders (params);
        return this.parseOrders (response['data']['orders'], symbol, since, limit);
    }

    async fetchOpenOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        const request = { 'queryParams': { 'open': true }};
        const response = await this.privateGetOrders (this.extend (request, params));
        return this.parseOrders (response['data']['orders'], symbol, since, limit);
    }

    async fetchClosedOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        const request = { 'queryParams': { 'open': false }};
        const response = await this.privateGetOrders (this.extend (request, params));
        return this.parseOrders (response['data']['orders'], symbol, since, limit);
    }

    parseOrders (orders, symbol = undefined, since = undefined, limit = undefined, params = {}) {
        const result = [];
        if (typeof since === 'string') {
            since = this.parse8601 (since);
        }
        for (let i = 0; i < orders.length; i++) {
            const order = this.parseOrder (orders[i]);
            if (symbol === undefined || symbol === order['symbol']) {
                if (since === undefined || order['timestamp'] >= since) {
                    result.push (order);
                }
            }
        }
        return result.slice (0, limit);
    }

    async fetchDepositAddress (code, params = {}) {
        const request = { 'currency': code };
        const response = await this.privatePostDepositAddressCurrency (this.extend (request, params));
        const result = {
            'currency': code,
            'info': response,
            'tag': undefined,
            'address': response['data']['address'],
        };
        return result;
    }

    async fetchDeposits (code = undefined, since = undefined, limit = undefined, params = {}) {
        const response = await this.privateGetDeposits (params);
        const result = [];
        if (since === undefined) {
            since = 0;
        } else if (typeof since === 'string') {
            since = this.parse8601 (since);
        }
        const ds = response['data']['deposits'];
        for (let i = 0; i < ds.length; i++) {
            const deposit = {};
            deposit['timestamp'] = this.parse8601 (this.safeString (ds[i], 'created_at'));
            if (deposit['timestamp'] < since) {
                break;
            }
            deposit['id'] = this.safeString (ds[i], 'id');
            deposit['txid'] = this.safeString (ds[i]['network_data'], 'txid');
            deposit['datetime'] = this.safeString (ds[i], 'created_at');
            let address = undefined;
            let tag = undefined;
            if (this.safeString (ds[i], 'address').indexOf (':') !== -1) {
                address = this.safeString (ds[i], 'address').split (':')[0];
                tag = this.safeString (ds[i], 'address').split (':')[1];
            } else {
                address = this.safeString (ds[i], 'address');
            }
            deposit['addressFrom'] = undefined;
            deposit['address'] = address;
            deposit['addressTo'] = address;
            deposit['tagFrom'] = undefined;
            deposit['tag'] = tag;
            deposit['tagTo'] = tag;
            deposit['type'] = 'deposit';
            deposit['amount'] = this.safeFloat (ds[i], 'amount');
            deposit['currency'] = this.safeString (ds[i], 'currency');
            deposit['status'] = this.safeString (ds[i], 'status');
            deposit['updated'] = undefined;
            deposit['comment'] = undefined;
            deposit['fee'] = undefined;
            deposit['info'] = ds[i];
            result.push (deposit);
        }
        return result;
    }

    async fetchWithdrawals (code = undefined, since = undefined, limit = undefined, params = {}) {
        const response = await this.privateGetWithdraws (params);
        const result = [];
        if (since === undefined) {
            since = 0;
        } else if (typeof since === 'string') {
            since = this.parse8601 (since);
        }
        const ws = response['data']['withdraws'];
        for (let i = 0; i < ws.length; i++) {
            const withdraw = {};
            withdraw['timestamp'] = this.parse8601 (this.safeString (ws[i], 'created_at'));
            if (withdraw['timestamp'] < since) {
                break;
            }
            withdraw['id'] = this.safeString (ws[i], 'id');
            withdraw['txid'] = this.safeString (ws[i]['network_data'], 'txid');
            withdraw['datetime'] = this.safeString (ws[i], 'created_at');
            let address = undefined;
            let tag = undefined;
            if (this.safeString (ws[i], 'address').indexOf (':') !== -1) {
                address = this.safeString (ws[i], 'address').split (':')[0];
                tag = this.safeString (ws[i], 'address').split (':')[1];
            } else {
                address = this.safeString (ws[i], 'address');
            }
            withdraw['addressFrom'] = undefined;
            withdraw['address'] = address;
            withdraw['addressTo'] = address;
            withdraw['tagFrom'] = undefined;
            withdraw['tag'] = tag;
            withdraw['tagTo'] = tag;
            withdraw['type'] = 'withdrawal';
            withdraw['amount'] = this.safeFloat (ws[i], 'amount');
            withdraw['currency'] = this.safeString (ws[i], 'currency');
            withdraw['status'] = this.safeString (ws[i], 'status');
            withdraw['updated'] = undefined;
            withdraw['comment'] = undefined;
            withdraw['fee'] = undefined;
            withdraw['info'] = ws[i];
            result.push (withdraw);
        }
        return result;
    }

    async fetchTransactions (code = undefined, since = undefined, limit = undefined, params = {}) {
        const deposits = await this.fetchDeposits (code, since, limit);
        const withdraws = await this.fetchWithdrawals (code, since, limit);
        const result = [];
        for (let i = 0; i < deposits.length; i++) {
            result.push (deposits[i]);
        }
        for (let i = 0; i < withdraws.length; i++) {
            result.push (withdraws[i]);
        }
        return result;
    }

    async withdraw (code, amount, address, tag = undefined, params = {}) {
        const request = { 'address': address, 'amount': amount, 'currency': code };
        if (tag !== undefined) {
            request['address'] = address + ':' + tag;
        }
        return await this.privatePostWithdraw (this.extend (request, params));
    }

    nonce () {
        return this.milliseconds ();
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = '/' + this.version + '/';
        if (api === 'private') {
            url += 'user/';
        }
        url += this.implodeParams (path, params);
        const request = this.omit (params, this.extractParams (path));
        if (method === 'POST') {
            body = this.json (request);
        } else {
            if (Object.keys (request).length) {
                url += '?' + this.urlencode (request);
            }
        }
        if (api === 'private') {
            const timestamp = this.milliseconds ().toString ();
            const bodyAsString = (method === 'POST') ? body : '';
            const auth = [
                method,
                url,
                timestamp,
                bodyAsString,
                this.secret,
            ].join ("\n"); // eslint-disable-line quotes
            const hash = this.hash (this.encode (auth), 'sha256', 'base64');
            let key = this.apiKey;
            if (typeof key !== 'string') {
                key = key.toString ();
            }
            const signature = 'HMAC-SHA256 ' + key + ':' + this.decode (hash);
            headers = {
                'Authorization': signature,
                'HMAC-Timestamp': timestamp,
            };
            if (method === 'POST') {
                headers['Content-Type'] = 'application/json';
            }
        }
        url = this.urls['api'] + url;
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    handleErrors (code, reason, url, method, headers, body, response, requestHeaders, requestBody) {
        //
        //     {"errors":[{"code":"insuff_funds","title":"Your available balance is too low for that action"}]}
        //     {"errors":[{"code": "invalid_auth","title": "Invalid HMAC signature"}]}
        //
        if (response === undefined) {
            return;
        }
        const errors = this.safeValue (response, 'errors', []);
        const numErrors = errors.length;
        if (numErrors < 1) {
            return;
        }
        const feedback = this.id + ' ' + body;
        for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            const errorCode = this.safeString (error, 'code');
            this.throwExactlyMatchedException (this.exceptions['exact'], errorCode, feedback);
        }
        throw new ExchangeError (feedback); // unknown message
    }
};
