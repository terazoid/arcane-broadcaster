import NeDbClient from './clients/nedbclient';

/**
 * Connect to current database
 *
 * @param {String} url
 * @param {Object} options
 * @returns {Promise}
 */
export function connect(url, options) {
    if (url.indexOf('nedb://') > -1) {
        // url example: nedb://path/to/file/folder
        return NeDbClient.connect(url, options).then(function(db) {
            global.CLIENT = db;
            return db;
        });
    } else {
        return Promise.reject(new Error('Unrecognized DB connection url.'));
    }
};