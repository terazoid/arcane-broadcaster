import expresrs from 'express';
import ImageContainer from './ImageContainer';
import Message from './Message';
const app = expresrs();

app.get('/', (req, res) => {
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

app.listen(3000, () => console.log('Example app listening on port 3000!'));
