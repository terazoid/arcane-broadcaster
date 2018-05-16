import Path from "path";
import express from 'express';

export default function(app) {
    app.use('/', express.static(Path.join(__dirname, './public')));
    app.set('views', Path.join(__dirname, './views'));
    app.set('view engine', 'ejs');
}