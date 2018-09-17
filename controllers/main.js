'use strict';

let ctrlName = 'main'
    , views = require('../utils/views')(ctrlName)
    ;

/**
 * Method: ALL
 * URI: *
 * */
module.exports.common = function (req, res, next) {
    res.viewData = {};
    
    res.viewData.errors = [];

    next();
}

module.exports.sma1550 = async function (req, res, next) {
    try {
        let view = 'sma-15-50'
            , viewData = {}
            ;

        res.viewData.layout = 'layout';

        let Strategy = require('../classes/strategy')
            , sma1550 = require('../strategies/sma-15-50')
            ;

        let strategy = new Strategy('sma-15-50', sma1550.init, sma1550.tick);
        await strategy.init();

        let tickData = await strategy._tick();
        let graphics = {
            data: JSON.stringify(tickData)
        };
        graphics.isins = Object.keys(tickData);
        viewData.graphics = graphics;

        res.viewData.content = views.render(view, viewData);
        if (!res.viewData.content) {
            res.viewData.content = 'Not found';
        }

        return next();
    } catch (err) {
        console.log(err);
    }
}

module.exports.tests = async function (req, res, next) {
    let Micex = require('micex.api')
        , view = 'tests'
        , viewData = {}
        ;

    res.viewData.layout = 'layout';

    let security = await Micex.securityMarketdata('AFLT');
    console.log(security);

    res.viewData.content = views.render(view, viewData);
    if (!res.viewData.content) {
        return next(new HttpError(404, 'Not found'));
    }

    return next();
}

/**
 * Method: ALL
 * URI: *
 * */
exports.commonEnd = function (req, res, next) {
    if (!res.viewData || !res.viewData.layout) {
        return next();
    }

    return res.render(res.viewData.layout, res.viewData, res.viewData.partials || null);
}