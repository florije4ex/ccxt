#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Created by florije4ex / florije4ex@gmail.com at 2020/7/23.
Copyright to BIXIN GLOBAL Co.,Ltd.
"""

import hashlib
import hmac
import time
import uuid
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
                    'v1': 'api.sandbox.876ex.com',
                    'public': 'api.sandbox.876ex.com',
                    'private': 'api.sandbox.876ex.com',
                },
                'www': 'api.sandbox.876ex.com',
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
        response = self.public_get_market_trades(params)
        return response

    def fetch_time(self, params={}):
        response = self.public_get_market_timestamp(params)
        return self.safe_integer(response, 'timestamp')

    def fetch_balance(self, params={}):
        response = self.private_get_spots_accounts(params)
        return response

    def fetch_order_book(self, symbol, limit=None, params={}):
        response = self.public_get_market_spots_orderbook_symbol({'symbol': symbol})
        return response

    def fetch_ticker(self, symbol=None, params={}):
        response = self.public_get_market_ticks_symbol({'symbol': symbol})
        return response

    def fetch_ohlcv(self, symbol, timeframe='1m', since=None, limit=None, params={}):
        pass

    def fetch_trades(self):
        pass

    def create_order(self, symbol, type, side, amount, price=None, params={}):
        request = {
            "symbol": symbol,
            "type": type,
            "direction": 'LONG' if side == 'BUY' else 'SHORT',
            "price": price,
            "quantity": amount,
        }
        response = self.private_post_spots_orders(request)
        return response

    def cancel_order(self, id, symbol=None, params={}):
        response = self.private_post_spots_orders_orderid_cancel({'orderId': id})
        return response

    def fetch_order(self, id, symbol=None, params={}):
        response = self.private_get_spots_orders_orderid({'orderId': id})
        return response

    def sign(self, path, api='public', method='GET', params={}, headers=None, body=None):
        host = self.urls['api'][api]
        url = 'https://' + host + '/v1/' + self.implode_params(path, params)
        headers = {
            'API-Key': self.apiKey,
            'API-Signature-Method': 'HmacSHA256',
            'API-Signature-Version': '1',
            'API-Timestamp': str(int(time.time() * 1000))
        }
        if api == 'private':
            if method == 'POST':
                payload = [method, host, '/v1/' + path, '&'.join([])]
                headers['API-Unique-ID'] = uuid.uuid4().hex
                headers_list = ['%s: %s' % (k.upper(), v) for k, v in headers.items()]
                headers_list.sort()
                payload.extend(headers_list)
                payload.append(self.json(params) if params else '')
                payload_str = '\n'.join(payload)
                # signature:
                sign = hmac.new(self.secret.encode('utf-8'), payload_str.encode('utf-8'), hashlib.sha256).hexdigest()
                headers['API-Signature'] = sign
                headers['Content-Type'] = 'application/json'
                body = self.json(params)
            else:
                pass
        else:
            if params:
                url += '?' + self.urlencode(params)
        result = {'url': url, 'method': method, 'body': body, 'headers': headers}
        return result
