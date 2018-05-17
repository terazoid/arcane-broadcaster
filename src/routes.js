import ImageContainer from "./ImageContainer";
import Message from "./Message";
import app from './App';

export default function(server) {
    server.get('/', asyncMiddleware(async (req, res) => {
        const threads = app.getThreadsPage(1);
        const body = await render('index', {threads});
        res.render('./layout', {title: 'title', body});
    }));

    server.all('/post', asyncMiddleware(async (req, res) => {
        if(req.method == 'POST') {
            
        }
        const threads = app.getThreadsPage(1);
        const body = await render('new-thread');
        res.render('./layout', {title: 'title', body});
    }));

    server.get('/thread/:id', asyncMiddleware(async (req, res) => {
        const {message, replies} = app.getThread(req.params.id);
        const body = await render('thread', {message, replies});
        res.render('./layout', {title: 'title', body});
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
