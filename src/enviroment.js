import Path from "path";
import express from 'express';
import _ from 'lodash';
import dateFormat from 'dateformat';
import bodyParser from 'body-parser';

export default function(app) {
    app.use('/', express.static(Path.join(__dirname, './public')));
    app.set('views', Path.join(__dirname, './views'));
    app.set('view engine', 'ejs');
    app.use(bodyParser.urlencoded({ extended: true }));
    app.locals.htmlDisplay = html => _.escape(html).replace(/\n/g, '<br>');
    app.locals.dateFormat = dateFormat;
    app.locals._ = _;
}