import express from 'express';
const expressApp = express();
import configureEnviroment from './enviroment';
import configureRoutes from './routes';
import app from './App';

configureEnviroment(expressApp);
configureRoutes(expressApp);

const server = expressApp.listen(3000, () => console.log('Started web server on port 3000'));
app.init();

process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);

let connections = [];

server.on('connection', connection => {
    connections.push(connection);
    connection.on('close', () => connections = connections.filter(curr => curr !== connection));
});

function shutDown() {
    console.log('Received kill signal, shutting down gracefully');
    app.close();
    server.close(() => {
        console.log('Closed out remaining connections');
        process.exit(0);
    });

    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);

    connections.forEach(curr => curr.end());
    setTimeout(() => connections.forEach(curr => curr.destroy()), 5000);
}
//
// const key = new NodeRSA({b:512});
//
// console.log(key.exportKey('private'));
// console.log(key.exportKey('public'));