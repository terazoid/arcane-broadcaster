import ImageContainer from "./ImageContainer";
import Message from "./Message";
import Place from "./Place";
import app from './App';
import _ from 'lodash';

export default function(server) {
    server.get('/', asyncMiddleware(async (req, res) => {
        const threads = app.getThreadsPage(1);
        const body = await render('index', {threads});
        res.render('./layout', {title: 'Messages', body, page: 'main'});
    }));

    server.all('/post', asyncMiddleware(async (req, res) => {
        const form = new Message({
            date: Date.now()/1000|0,
            message: '',
            pending: true,
            parent: null,
        });
        if(req.method === 'POST') {
            _.assign(form, _.pick(req.body, ['message']));
            if(form.validate()) {
                form.save();
                return res.redirect('/');
            }
        }
        const body = await render('newThread', {form});
        res.render('./layout', {title: 'New message', body, page: 'post'});
    }));

    server.all('/thread/:id', asyncMiddleware(async (req, res) => {
        const {thread, replies} = app.getThread(req.params.id);
        const form = new Message({
            date: Date.now()/1000|0,
            message: '',
            pending: true,
            parent: req.params.id,
        });
        if(req.method === 'POST') {
            _.assign(form, _.pick(req.body, ['message']));
            if(form.validate()) {
                form.save();
                return res.redirect('.');
            }
        }
        const body = await render('thread', {thread, replies, form});
        res.render('./layout', {title: 'Thread '+req.params.id, body, page: 'thread'});
    }));

    server.all('/places', asyncMiddleware(async (req, res) => {
        const places = Place.findAll();
        const form = new Place({});
        if(req.method === 'POST') {
            switch(_.get(req.body, 'action')) {
                case 'add':
                    _.assign(form, _.pick(req.body, ['url']));
                    form.enabled = true;
                    if(form.validate()) {
                        form.save();
                        return res.redirect('/places');
                    }
                    break;
                case 'delete':
                    if(typeof req.body.id !== 'undefined') {
                        Place.delete(req.body.id);
                        return res.redirect('/places');
                    }
                    break;
            }
        }
        const body = await render('places', {places, form});
        res.render('./layout', {title: 'Places ', body, page: 'places'});
    }));

    server.all('/container', asyncMiddleware(async (req, res) => {
        // const container = await ImageContainer.fromFile('input.png');
        // container.writeBlock(...);
        // return container.save('output.png');
    }));

    async function render(file, data={}) {
        return new Promise((resolve, reject)=>{
            server.render(file, data, (err, result)=>{
                if(err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        });
    }
}

const asyncMiddleware = fn =>
    (req, res, next) => {
        Promise.resolve(fn(req, res, next))
            .catch(next);
    };
