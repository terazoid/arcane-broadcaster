const assertConnected = function(db) {
    if (db === null || db === undefined) {
        throw new Error('You must first call \'connect\' before loading/saving documents.');
    }
};

export const getClient = function() {
    const client = global.CLIENT;
    assertConnected(client);
    return client;
};