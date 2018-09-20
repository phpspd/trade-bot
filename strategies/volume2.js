'use strict';

let datesHelper = require('../utils/dates-helper')
    ;
    
const MS_IN_DAY = 24 * 60 * 60 * 1000
    ;

let ISINs = [
    'AFKS',
    'AFLT', //!
    'CHMF',
    'HIMCP',
    'HYDR',
    'MFON',
    'MOEX',
    'UPRO',
    'SBER',
    'GAZP',
    'TATN',
    'GMKN',
    'MTLR',
    //'MTLRP', !
    'NLMK',
    'MAGN',
    'RASP',// !
    'BANE' //!
];

async function init() {
    for (let ISIN of ISINs) {
        await this.addSecurity(ISIN, 'stock', 'shares', 'TQBR');
    }
}

async function tick (finishCb) {
    let START_SUM = 1000000;
    let currentBuySum = 0;
    let maxCurrentBuySum = 0;
    const MAX_BUY_SUM = 10000;
    const START_DAY_BEFORE = 366;
    let result = {
        items: {}
    };
    for (let ISIN of ISINs) {
        result.items[ISIN] = {
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

        let volumeAvg = 0
            , volumeSum = 0
            , priceAvg = 0
            , priceSum = 0
            ;

        for (let i = START_DAY_BEFORE; i > 0; --i) {
            if (!security.getPrice(i)) {
                continue;
            }
            result.items[ISIN].graphic.push({
                date: security.getDate(i),
                price: security.getPrice(i),
                sma15: Math.round(sma15.getValue(i) * 100) / 100,
                sma50: Math.round(sma50.getValue(i) * 100) / 100,
                ema20: Math.round(ema20.getValue(i) * 100) / 100,
                ema30: Math.round(ema30.getValue(i) * 100) / 100,
                ema100: Math.round(ema100.getValue(i) * 100) / 100,
                volume: security.getVolume(i)
            });

            let T0Data = result.items[ISIN].graphic[result.items[ISIN].graphic.length - 1];

            if (result.items[ISIN].graphic.length > 1) {
                let T1Data = result.items[ISIN].graphic[result.items[ISIN].graphic.length - 2];
                volumeSum += T1Data.volume;
                priceSum += T1Data.price;

                volumeAvg = volumeSum / (START_DAY_BEFORE - i + 1);
                priceAvg = priceSum / (START_DAY_BEFORE - i + 1);
            }

            if (result.items[ISIN].graphic.length > 2) {
                let T1Data = result.items[ISIN].graphic[result.items[ISIN].graphic.length - 2];
                let T2Data = result.items[ISIN].graphic[result.items[ISIN].graphic.length - 3];

                if (+datesHelper.parseDateSmart(T0Data.date) < +datesHelper.parseDateSmart('2018-01-01')) {
                    continue;
                }

                if (T1Data.volume / volumeAvg >= 5 && T1Data.price / T2Data.price <= 0.98 && T0Data.price < T2Data.price && T1Data.sma15 > T1Data.price /*&& T1Data.price / priceAvg <= 0.92*/) {
                    buy.push({
                        ISIN: ISIN,
                        amount: Math.ceil(MAX_BUY_SUM / (security.getLotSize() * T0Data.price)) * security.getLotSize() || security.getLotSize(),
                        date: T0Data.date,
                        price: T0Data.price,
                        sma15: T0Data.sma15,
                        sma50: T0Data.sma50,
                        ema20: T0Data.ema20,
                        ema30: T0Data.ema30,
                        ema100: T0Data.ema100,
                        reason: 1
                    });
                } else if (T0Data.price / T0Data.sma15 <= 0.93) {
                    buy.push({
                        ISIN: ISIN,
                        amount: Math.ceil(MAX_BUY_SUM / (security.getLotSize() * T0Data.price)) * security.getLotSize() || security.getLotSize(),
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
                        buyItem.reason == 1 && /*T1Data.volume / volumeAvg >= 1.5 && */T0Data.price / buyItem.price >= 1.07
                    ) {
                        buyItem.soldPrice = T0Data.price;
                        buyItem.soldDate = T0Data.date;
                        buyItem.sold = true;
                        currentBuySum -= buyItem.price * buyItem.amount;
                    } else if (
                        buyItem.reason == 2 && /*T1Data.volume / volumeAvg >= 1.5 && */T0Data.price / buyItem.price >= 1.07
                    ) {
                        buyItem.soldPrice = T0Data.price;
                        buyItem.soldDate = T0Data.date;
                        buyItem.sold = true;
                        currentBuySum -= buyItem.price * buyItem.amount;
                    }
                }

                if (currentBuySum > maxCurrentBuySum) {
                    maxCurrentBuySum = currentBuySum;
                }
            }
        }

        let lastGraphicItem = result.items[ISIN].graphic[result.items[ISIN].graphic.length - 1];
        result.items[ISIN].trades = buy.map((item) => {
            if (!item.soldDate) {
                item.soldDate = lastGraphicItem.date;
                item.soldPrice = lastGraphicItem.price;
            }
            return item;
        });
        result.items[ISIN].buySum = result.items[ISIN].trades.reduce((sum, item) => { return sum + (item.price * item.amount) }, 0);
        result.items[ISIN].profit = result.items[ISIN].trades.reduce((sum, item) => { return sum + (item.soldPrice - item.price) * item.amount }, 0);
        result.items[ISIN].profitRel = Math.round(result.items[ISIN].profit * 100 * 100 / result.items[ISIN].buySum) / 100;
    }

    let trades = [];
    for (let ISIN in result.items) {
        trades = trades.concat(result.items[ISIN].trades);
    }
    trades = trades.sort((item1, item2) => {
        if (+datesHelper.parseDateSmart(item1.date) > +datesHelper.parseDateSmart(item2.date)) {
            return 1;
        } else if (+datesHelper.parseDateSmart(item2.date) > +datesHelper.parseDateSmart(item1.date)) {
            return -1;
        }
        return 0;
    })
    let resultTrades = [];
    for (let trade of trades) {
        if (START_SUM - calcTradesSum(resultTrades, trade.date) >= trade.price * trade.amount) {
            resultTrades.push(trade);
            maxCurrentBuySum = calcTradesSum(resultTrades, trade.date) > maxCurrentBuySum ? calcTradesSum(resultTrades, trade.date) : maxCurrentBuySum;
        }
    }
    result.trades = resultTrades;
    result.buySum = maxCurrentBuySum;
    result.profit = -calcTradesSum(result.trades, datesHelper.getCurrentDate());
    result.profitRel = Math.round(result.profit * 100 * 100 / result.buySum) / 100;
    return finishCb(result);
}

function calcTradesSum(resultTrades, currentDate) {
    return resultTrades.reduce((sum, item) => {
        sum += item.price * item.amount;
        if (+datesHelper.parseDateSmart(item.soldDate) <= +datesHelper.parseDateSmart(currentDate)) {
            sum -= item.soldPrice * item.amount;
        }
        return sum;
    }, 0);
}

module.exports.init = init;
module.exports.tick = tick;