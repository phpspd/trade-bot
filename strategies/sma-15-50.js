'use strict';

let datesHelper = require('../utils/dates-helper')
    ;
    
const MS_IN_DAY = 24 * 60 * 60 * 1000
    ;

let ISINs = [
    //'AFKS',
    'AFLT',
    'CHMF',
    //'HIMCP',
    //'HYDR',
    'MFON',
    'MOEX',
    //'UPRO',
    'SBER',
    'GAZP',
    'TATN',
    'GMKN'
];

async function init() {
    for (let ISIN of ISINs) {
        await this.addSecurity(ISIN, 'stock', 'shares', 'TQBR');
    }
}

async function tick (finishCb) {
    let result = {};
    for (let ISIN of ISINs) {
        result[ISIN] = {
            graphic: []
        };
        let security = this.getSecurity(ISIN);

        let sma15 = security.addIndicator('sma', 'sma-15', [15]);
        let sma50 = security.addIndicator('sma', 'sma-15', [50]);
        let ema20 = security.addIndicator('ema', 'ema-20', [20]);
        let ema30 = security.addIndicator('ema', 'ema-30', [30]);
        let ema100 = security.addIndicator('ema', 'ema-100', [100]);

        let canBeBoughtIfPriceNearEMA30 = false
            , buy = []
            ;

        for (let i = 366; i > 0; --i) {
            if (!security.getPrice(i)) {
                continue;
            }
            result[ISIN].graphic.push({
                date: security.getDate(i),
                price: security.getPrice(i),
                sma15: Math.round(sma15.getValue(i) * 100) / 100,
                sma50: Math.round(sma50.getValue(i) * 100) / 100,
                ema20: Math.round(ema20.getValue(i) * 100) / 100,
                ema30: Math.round(ema30.getValue(i) * 100) / 100,
                ema100: Math.round(ema100.getValue(i) * 100) / 100,
                volume: security.getVolume(i)
            });

            if (result[ISIN].graphic.length > 2) {
                let T0Data = result[ISIN].graphic[result[ISIN].graphic.length - 1];
                let T1Data = result[ISIN].graphic[result[ISIN].graphic.length - 2];
                let T2Data = result[ISIN].graphic[result[ISIN].graphic.length - 3];

                if (+datesHelper.parseDateSmart(T0Data.date) < +datesHelper.parseDateSmart('2018-01-01')) {
                    continue;
                }

                if ((T1Data.sma15 - T1Data.price) / T1Data.price > /*0.03*/ 0.015 && (T1Data.ema100 - T1Data.price) / T1Data.ema100 > /*0.065*/ 0.03) {
                    buy.push({
                        date: T0Data.date,
                        price: T0Data.price,
                        sma15: T0Data.sma15,
                        sma50: T0Data.sma50,
                        ema20: T0Data.ema20,
                        ema30: T0Data.ema30,
                        ema100: T0Data.ema100,
                        reason: 1
                    });
                } else if (T1Data.price / T1Data.ema100 < 0.96) {
                    buy.push({
                        date: T0Data.date,
                        price: T0Data.price,
                        sma15: T0Data.sma15,
                        sma50: T0Data.sma50,
                        ema20: T0Data.ema20,
                        ema30: T0Data.ema30,
                        ema100: T0Data.ema100,
                        reason: 2
                    });
                }

                for (let buyItem of buy) {
                    if (buyItem.sold || +datesHelper.parseDateSmart(buyItem.date) == +datesHelper.parseDateSmart(T0Data.date)) {
                        continue;
                    }

                    if (
                        buyItem.reason == 1 && T1Data.sma50 / T1Data.ema100 >= /*1.015*/ 1.015 || (T1Data.ema20 - T1Data.ema100) / T1Data.ema100 > 0.05/*0.05*/
                    ) {
                        buyItem.soldPrice = T0Data.price;
                        buyItem.soldDate = T0Data.date;
                        buyItem.sold = true;
                    } else if (buyItem.reason == 2 && T1Data.ema100 / T1Data.price < 0.95) {
                        buyItem.soldPrice = T0Data.price;
                        buyItem.soldDate = T0Data.date;
                        buyItem.sold = true;
                    }
                }
            }
        }

        let lastGraphicItem = result[ISIN].graphic[result[ISIN].graphic.length - 1];
        result[ISIN].trades = buy.map((item) => {
            if (!item.soldDate) {
                item.soldDate = lastGraphicItem.date;
                item.soldPrice = lastGraphicItem.price;
            }
            return item;
        });
        result[ISIN].buySum = result[ISIN].trades.reduce((sum, item) => { return sum + item.price }, 0);
        result[ISIN].profit = result[ISIN].trades.reduce((sum, item) => { return sum + item.soldPrice - item.price }, 0);
        result[ISIN].profitRel = Math.round(result[ISIN].profit * 100 * 100 / result[ISIN].buySum) / 100;
    }
    return finishCb(result);
}

module.exports.init = init;
module.exports.tick = tick;