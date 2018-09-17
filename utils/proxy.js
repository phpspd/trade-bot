let request = require('./awaitable-request')
    , queryString = require('qs')
    , datesHelper = require('../utils/dates-helper')
    , Micex = require('micex.api')
    ;

let config = require('../config');

const PROXY_BASE_URL = config.get('proxy_url') || 'https://iss.moex.com/iss';

function processItem(columns, data) {
    let result = {};
    for (let i = 0; i < data.length; ++i) {
        result[columns[i]] = data[i];
    }

    return result;
}

function processResponse(columns, data) {
    if (Array.isArray(data)) {
        for (let key in data) {
            data[key] = processItem(columns, data[key]);
        }
    } else {
        data = processItem(columns, data);
    }

    return data;
}

module.exports.getHistory = async function(engine, market, board, ISIN, format, fromDate, tillDate) {
    format = format || 'json';
    let url = PROXY_BASE_URL + '/history';
    if (engine) {
        url += '/engines/' + engine;
    }
    if (market) {
        url += '/markets/' + market;
    }
    if (board) {
        url += '/boards/' + board;
    }
    if (ISIN) {
        url += '/securities/' + ISIN;
    }
    if (format) {
        url += '.' + format;
    }
    if (fromDate) {
        if (fromDate instanceof Date) {
            fromDate = datesHelper.getDate(fromDate, 'iso');
        }
        url += '?from=' + fromDate;
    }
    if (tillDate) {
        if (tillDate instanceof Date) {
            tillDate = datesHelper.getDate(tillDate, 'iso');
        }
        url += (url.indexOf('?') === -1 ? '?' : '&') + 'till=' + fromDate;
    }

    let response = await request({
        url: url,
        method: 'GET'
    });

    if (format == 'json') {
        response = JSON.parse(response);
    }

    return processResponse(response.history.columns, response.history.data);
}

module.exports.getPrice = async function(ISIN) {
    let response = await Micex.securityMarketdata(ISIN);
    return response.LAST;
}