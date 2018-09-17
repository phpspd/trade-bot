'use strict';

let datesHelper = require('../utils/dates-helper')
    ;
    
const MS_IN_DAY = 24 * 60 * 60 * 1000
    ;

let ISINs = [
    'AFKS',
    'AFLT',
    'CHMF',
    //'HIMCP',
    //'HYDR',
    'MFON',
    'MOEX',
    //'UPRO',
    //'SBER'
];

async function init() {
    for (let ISIN of ISINs) {
        await this.addSecurity(ISIN, 'stock', 'shares', 'TQBR');
    }
}

async function tick (finishCb) {
    let result = {};
    for (let ISIN of ISINs) {
        result[ISIN] = [];
        let security = this.getSecurity(ISIN);

        let sma15 = security.addIndicator('sma', 'sma-15', [15]);
        let sma50 = security.addIndicator('sma', 'sma-15', [50]);
        let ema100 = security.addIndicator('ema', 'ema-100', [30]);

        for (let i = 366; i > 0; --i) {
            result[ISIN].push({
                date: security.getDate(i),
                price: security.getPrice(i),
                sma15: Math.round(sma15.getValue(i) * 100) / 100,
                sma50: Math.round(sma50.getValue(i) * 100) / 100,
                ema100: Math.round(ema100.getValue(i) * 100) / 100
            });
        }
    }
    return finishCb(result);
}

module.exports.init = init;
module.exports.tick = tick;