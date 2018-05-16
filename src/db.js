import Database from 'better-sqlite3';
import fs from 'fs';


const dbFile = 'app.db';
const firstRun = !fs.existsSync(dbFile);
let db = new Database(dbFile, {});

if(firstRun) {
    db.exec('CREATE TABLE messages (id CHAR(32) PRIMARY KEY, date INT NOT NULL, message VARCHAR(65536) NOT NULL, parent CHAR(32) NULL)');
}

/*db.runAsync = function (sql, params) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function cb(err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};
db.getAsync = function (sql, params) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, function cb(err, row) {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};
db.allAsync = function (sql, params) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, function cb(err, rows) {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};
db.execAsync = function (sql) {
    return new Promise((resolve, reject) => {
        db.exec(sql, function cb(err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};*/

export default db;