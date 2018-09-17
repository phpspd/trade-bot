let config = require('../config')
    , proxy = require('../utils/proxy')
    , datesHelper = require('../utils/dates-helper')
    , fs = require('fs')
    , path = require('path')
    ;

const HISTORY_FROM_DAYS_BEFORE = 400
    , MS_IN_DAY = 24 * 60 * 60 * 1000
    , MAX_HISTORY_FROM_DAYS_BEFORE = 1000
    ;

function Security (ISIN, engine, market, board) {
    this.ISIN = ISIN;
    this.history = [];
    this.indicators = {};
    this.price = 0.0;
    this.engine = engine;
    this.market = market;
    this.board = board;
}

Security.prototype.init = async function() {
    await this._fillHistory();
    this.price = await this._getCurrentPrice();
    /*this.history.push({
        CLOSE: this.price,
        TRADEDATE: datesHelper.getCurrentDate('iso')
    });*/
}

Security.prototype.getISIN = function() {
    return this.ISIN;
}

Security.prototype._fillHistory = async function (fromDate) {
    if (typeof fromDate == 'number') {
        fromDate = new Date(fromDate);
    }
    if (!(fromDate instanceof Date)) {
        fromDate = null;
    }
    if (datesHelper.getDateNow() - (+fromDate) > MAX_HISTORY_FROM_DAYS_BEFORE * MS_IN_DAY) {
        fromDate = new Date(datesHelper.getDateNow() - MAX_HISTORY_FROM_DAYS_BEFORE * MS_IN_DAY);
    }
    fromDate = fromDate || datesHelper.getStartTodayDate() - (HISTORY_FROM_DAYS_BEFORE * MS_IN_DAY);

    let data = [];
    do {
        data = await this._getHistory(datesHelper.getDate(fromDate, 'iso'));
        if (data && data.length) {
            if (this.history.length && data[data.length - 1].TRADEDATE == this.history[this.history.length - 1].TRADEDATE) {
                break;
            }
            this.history = this.history.concat(data);
        }
        let lastHistoryItem = this.history[this.history.length - 1];
        if (+datesHelper.parseDateSmart(lastHistoryItem.TRADEDATE) != +datesHelper.getStartTodayDate()) {
            fromDate = datesHelper.parseDateSmart(lastHistoryItem.TRADEDATE);
        }
    } while (+fromDate < datesHelper.getStartTodayDate() && data.length);
}

Security.prototype._getHistory = async function (fromDate, tillDate) {
    if (fromDate instanceof Date) {
        fromDate = datesHelper.getDate(fromDate);
    }
    if (tillDate instanceof Date) {
        tillDate = datesHelper.getDate(tillDate);
    }

    let response = await proxy.getHistory(this.engine, this.market, this.board, this.ISIN, 'json', fromDate, tillDate);

    return response;
}

/*Security.prototype._getPricesByDate = async function (date) {
    let prices = await proxy.getPricesByDate(this.ISIN, date);
    return prices;
}*/

Security.prototype._getCurrentPrice = async function () {
    let price = await proxy.getPrice(this.ISIN);
    return price;
}

Security.prototype.getPrice = function(daysBefore) {
    if (daysBefore <= 0) {
        return this.price;
    }

    return this.history[this.history.length - daysBefore].CLOSE;
}

Security.prototype.getHistory = function() {
    return this.history;
}

Security.prototype.getHistoryByDate = function (date) {
    if (typeof date == 'number') {
        date = new Date(date);
    }
    if (!(date instanceof Date)) {
        date = null;
    }
    date = date || datesHelper.getStartTodayDate();

    let historyItem = this.history[datesHelper.getDate(date)];
    return historyItem;
}

Security.prototype.addIndicator = function (name, key, args) {
    if (!fs.existsSync(path.join(__dirname, 'indicators', name + '.js'))) {
        return false;
    }
    let Indicator = require('./indicators/' + name);
    args.unshift(this);
    this.indicators[key] = new Indicator(...args);

    return this.indicators[key];
}

Security.prototype.getIndicator = function (key) {
    return this.indicators[key] || false;
}

Security.prototype.getDate = function (daysBefore) {
    if (daysBefore <= 0) {
        return datesHelper.getCurrentDate();
    }

    return datesHelper.convertDateIso2Ru(this.history[this.history.length - daysBefore].TRADEDATE);
}

module.exports = Security;