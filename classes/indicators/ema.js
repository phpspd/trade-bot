'use strict';

let datesHelper = require('../../utils/dates-helper')
    , SMA = require('./sma')
    ;


const MS_IN_DAY = 24 * 60 * 60 * 1000
    ;

/**
 * 
 * @param {Security} security - object of Security class
 * @param {number} n - days in history before last line
 */
function ExponentialMovingAverage (security, n) {
    this.security = security;
    this.n = n;
}

ExponentialMovingAverage.prototype._calc = function(daysBeforeNow) {
    daysBeforeNow = daysBeforeNow || 0;

    let n = this.n;

    let history = this.security.history.filter((item) => { return item.CLOSE > 0 });
    let length = history.length;
    history = history.slice(length - n - daysBeforeNow, length - daysBeforeNow);

    if (history.length != n) {
        n = history.length;
    }

    let smaStart = new SMA(this.security, n).getValue(daysBeforeNow + 1);
    let alpha = 2 / (n + 1);

    let ema = history.reduce((sum, item) => {
        return alpha * item.CLOSE + (1 - alpha) * sum;
    }, smaStart);

    return ema;
}

ExponentialMovingAverage.prototype.getValue = function(daysBeforeNow) {
    return this._calc(daysBeforeNow);
}

module.exports = ExponentialMovingAverage;