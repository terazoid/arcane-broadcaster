import ImageContainer from "./ImageContainer";
import Message from "./Message";
import Place from "./Place";
import app from './App';
import _ from 'lodash';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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
        res.render('./layout', {title: 'Places', body, page: 'places'});
    }));

    server.all('/container', upload.single('image'), asyncMiddleware(async (req, res) => {
        // const container = await ImageContainer.fromFile('input.png');
        // container.writeBlock(...);
        // return container.save('output.png');
        let  messages = [];
        let image = null;
        if(req.method === 'POST') {
            let pending = Message.findPending();
            const container = await ImageContainer.fromBuffer(req.file.buffer);
            while(pending.length>0) {
                const message = pending.pop();
                try {
                    container.writeBlock(message);
                }
                catch(e) {
                    console.log(e);
                    break;
                }
                messages.push(message);
            }
            let places = Place.findAll();
            while(places.length>0) {
                const place = places.pop();
                try {
                    container.writeBlock(place);
                }
                catch(e) {
                    console.log(e);
                    break;
                }
            }
            if(messages.length>0) {
                //image = await new Promise((resolve, reject)=>image.getBase64("image/png", resolve));
                image = await container.getBase64("image/png");
            }
        }
        if(messages.length===0) {
            messages = Message.findPending();
        }
        const body = await render('container', {messages, image});
        res.render('./layout', {title: 'New container', body, page: 'container'});
    }));

    server.get('/update', asyncMiddleware(async (req, res) => {
        if(app.placesQueue.length() === 0 && app.imagesQueue.length() === 0) {
            const places = Place.findEnabled();
            app.placesQueue.push(places.map(place=>({url:place.url})));
        }
        return res.redirect('/');
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
