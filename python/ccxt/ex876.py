#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Created by florije4ex / florije4ex@gmail.com at 2020/7/23.
Copyright to BIXIN GLOBAL Co.,Ltd.
"""

from ccxt.base.exchange import Exchange

class ex876(Exchange):
    def describe(self):
        return self.deep_extend(super(ex876, self).describe(), {
            'id': 'ex876',
            'name': 'Ex876',
            'countries': ['CN'],
            'rateLimit': 500,
            'certified': True,
            'pro': True,
            'timeframes': {
                '1m': '1m',
                '3m': '3m',
                '5m': '5m',
                '15m': '15m',
                '30m': '30m',
                '1h': '1h',
                '2h': '2h',
                '4h': '4h',
                '6h': '6h',
                '12h': '12h',
                '1d': '1d',
                '1w': '1w',
            },
            'urls': {
                'api': {
                    'v1': 'http://api.sandbox.876ex.com/v1',
                    'public': 'http://api.sandbox.876ex.com/v1',
                    'private': 'http://api.sandbox.876ex.com/v1',
                },
                'www': 'http://api.sandbox.876ex.com/v1',
            },
            'api': {
                'public': {
                    'get': [
                        'market/trades',
                        'market/timestamp',
                        'market/fex',
                        'market/errorCodes',
                        'market/error',
                        'market/indexes',
                        'market/indexes/{name}',
                        'market/prices/{symbol}',
                        'market/prices',
                        'market/spots/orderbook/{symbol}',
                        'market/contracts/orderbook/{symbol}',
                        'market/ticks/{symbol}',
                        'market/bars/{symbol}/{type}',
                    ]
                },
                'private': {
                    'get': [
                        'spots/accounts',
                        'spots/fee/rate/{symbol}',
                        'spots/orders/{orderId}',
                        'spots/orders/{id}/matches',
                        'spots/match/clearings',
                        'spots/orders/open',
                        'spots/orders/closed',
                    ],
                    'post': [
                        'spots/orders',
                        'spots/orders/{orderId}/cancel',
                        'spots/orders/cancel',
                    ]
                }
            },
            'options': {

            },
            'exceptions': {

            }
        })

    def fetch_markets(self, params={}):
        pass

    def fetch_time(self):
        pass

    def fetch_balance(self):
        pass

    def fetch_order_book(self):
        pass

    def fetch_tickers(self, symbols=None, params={}):
        pass

    def fetch_ohlcv(self, symbol, timeframe='1m', since=None, limit=None, params={}):
        pass

    def fetch_trades(self):
        pass

    def create_order(self, symbol, type, side, amount, price=None, params={}):
        pass

    def cancel_order(self, id, symbol=None, params={}):
        pass

    def fetch_order(self, id, symbol=None, params={}):
        pass

    def sign(self, path, api='public', method='GET', params={}, headers=None, body=None):
        pass


