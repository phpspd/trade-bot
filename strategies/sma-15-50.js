'use strict';

let datesHelper = require('../utils/dates-helper')
    ;
    
const MS_IN_DAY = 24 * 60 * 60 * 1000
    ;

let ISINs = [
    //'AFKS',
    //'AFLT',
    'CHMF',
    //'HIMCP',
    //'HYDR',
    //'MFON',
    //'MOEX',
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
            result[ISIN].graphic.push({
                date: security.getDate(i),
                price: security.getPrice(i),
                sma15: Math.round(sma15.getValue(i) * 100) / 100,
                sma50: Math.round(sma50.getValue(i) * 100) / 100,
                ema20: Math.round(ema20.getValue(i) * 100) / 100,
                ema30: Math.round(ema30.getValue(i) * 100) / 100,
                ema100: Math.round(ema100.getValue(i) * 100) / 100
            });

            if (result[ISIN].graphic.length > 1) {
                let currentData = result[ISIN].graphic[result[ISIN].graphic.length - 1];
                let prevData = result[ISIN].graphic[result[ISIN].graphic.length - 2];

                if (
                    /*prevData.sma15 <= prevData.sma50 && */currentData.sma15 > currentData.sma50
                    && prevData.sma15 < currentData.sma15 //&& currentData.sma15 < currentData.price
                    && prevData.ema30 < currentData.ema30/* && prevData.price < currentData.price*/
                ) {
                    canBeBoughtIfPriceNearEMA30 = true;
                } else {
                    canBeBoughtIfPriceNearEMA30 = false;
                }

                if (
                    canBeBoughtIfPriceNearEMA30 && currentData.price > prevData.price
                    && (currentData.price * 1 <= currentData.ema30 || currentData.price * 1 <= currentData.ema100)
                ) {
                    buy.push({
                        date: currentData.date,
                        price: currentData.price,
                        sma15: currentData.sma15,
                        sma50: currentData.sma50,
                        ema20: currentData.ema20,
                        ema30: currentData.ema30,
                        ema100: currentData.ema100
                    });
                    canBeBoughtIfPriceNearEMA30 = false;
                }

                for (let buyItem of buy) {
                    if (buyItem.sold) {
                        continue;
                    }

                    if (
                        (
                            (buyItem.price * 0.98 <= buyItem.ema100 && currentData.price * 0.98 > currentData.ema100)
                            || (buyItem.price * 0.98 <= buyItem.ema30 && currentData.price * 0.98 > currentData.ema30)
                        )
                        && currentData.price <= prevData.price
                        && (
                            buyItem.price * 1.02 <= currentData.price || buyItem.price * 0.9 >= currentData.price
                            || prevData.ema30 > currentData.ema30 //|| currentData.sma15 < currentData.sma50
                            //|| currentData.sma15 < prevData.sma15
                        )
                    ) {
                        buyItem.soldPrice = currentData.price;
                        buyItem.soldDate = currentData.date;
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