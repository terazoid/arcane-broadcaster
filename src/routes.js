import ImageContainer from "./ImageContainer";
import Message from "./Message";
import app from './App';
import _ from 'lodash';

export default function(server) {
    server.get('/', asyncMiddleware(async (req, res) => {
        const threads = app.getThreadsPage(1);
        const body = await render('index', {threads});
        res.render('./layout', {title: 'Messages', body});
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
        const body = await render('new-thread', {form});
        res.render('./layout', {title: 'New message', body});
    }));

    server.get('/thread/:id', asyncMiddleware(async (req, res) => {
        const {thread, replies} = app.getThread(req.params.id);
        const body = await render('thread', {thread, replies});
        res.render('./layout', {title: 'Thread '+req.params.id, body});
    }));

    server.get('/test', (req, res) => {
        ImageContainer.fromFile('input.png').then((container)=>{
            const msg = new Message("ecfe0b2a", Date.now(), 'test message', null);
            container.writeBlock(msg);
            return container.save('output.png');
        }).then(()=>{
            return ImageContainer.fromFile('output.png');
        }).then((container)=>{
            res.send(container.readBlock().toString());
        }).catch((err)=>{
            console.error(err);
            res.status(500);
            res.send(JSON.stringify(err.message));
        });
    });

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
