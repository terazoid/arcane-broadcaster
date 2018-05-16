import ImageContainer from "./ImageContainer";
import Message from "./Message";
import NodeRSA from 'node-rsa';

export default function(app) {
    app.get('/', asyncMiddleware(async function (req, res) {
        const body = await render('index');
        res.render('./layout', {title: 'title', body});
    }));

    app.get('/key', (req, res) => {


        res.send(result);
    });

    app.get('/test', (req, res) => {
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
            app.render(file, data, (err, result)=>{
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