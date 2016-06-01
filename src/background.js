/* global chrome, Promise, triplesec */

let {storage, extension, runtime} = chrome;
let {local} = storage;
let simperium, bucket, encryptionPhrase, lockEvents;

let _async = Promise.coroutine;
//noinspection JSUnresolvedVariable
let bookmarks = Promise.promisifyAll(chrome.bookmarks, {promisifier: chromeBookmarksPromisifier});
let crypto = Promise.promisifyAll(triplesec);

// Bootstrap
local.get(['appid', 'apikey', 'encphrase'], function (items) {
    encryptionPhrase = items.encphrase;

    simperium = new Simperium(items.appid, {token: items.apikey});
    if (simperium) {
        bucket = simperium.bucket('bookmarks');

        bucket.start();
        bucket.on('notify', updateLocal);

        //noinspection JSUnresolvedVariable,JSUnresolvedFunction
        bookmarks.onCreated.addListener(updateRemote);
        //noinspection JSUnresolvedVariable,JSUnresolvedFunction
        bookmarks.onRemoved.addListener(updateRemote);
        //noinspection JSUnresolvedVariable,JSUnresolvedFunction
        bookmarks.onChanged.addListener(updateRemote);
        //noinspection JSUnresolvedVariable,JSUnresolvedFunction
        bookmarks.onMoved.addListener(updateRemote);
        //noinspection JSUnresolvedVariable,JSUnresolvedFunction
        bookmarks.onChildrenReordered.addListener(updateRemote);
    }
});

//noinspection JSUnresolvedFunction,JSUnresolvedVariable
extension.onRequest.addListener(
    function (request) {
        if (request.reload === true) {
            runtime.reload();
        }
    });

/*
 Gets called whenever we receive an update
 */
let updateLocal = _async(
    function*(id, data) {
        let dec;
        try {
            //noinspection JSUnresolvedFunction
            dec = yield crypto.decryptAsync({
                data: new triplesec.Buffer(data.content, "hex"),
                key: new triplesec.Buffer(encryptionPhrase)
            });
        } catch (e) {
            // If we're here, we haven't setup the options correctly yet
            return;
        }

        let incoming = JSON.parse(dec.toString());
        if (incoming.length === 0) {
            return;
        }

        //noinspection JSUnresolvedFunction
        let appNode = yield bookmarks.searchAsync({title: 'privatesync'});
        if (typeof appNode[0] === 'undefined') {
            console.warn('Folder not found');
            return;
        }

        let flatBookmarkList = yield getFlattenedBookmarks();

        //noinspection JSUnusedAssignment
        lockEvents = true; // No ping-pong please

        // Cleanup the nodes that do not have an incoming value
        for (let bookmark of flatBookmarkList) {
            let matches = incoming.filter(item => item.hash === bookmark.hash);

            if (matches.length === 0) {
                // Race condition check on nested delete events
                // This can be simplified ... or rather... complicated by suppressing runtime.lastError instead
                // In the meantime:
                let current = yield getFlattenedBookmarks();
                if (current.filter(item => item.localId === bookmark.localId).length === 0) {
                    return;
                }

                // Remove recursively
                //noinspection JSUnresolvedFunction
                yield bookmarks.removeTreeAsync(bookmark.localId);
            }
        }

        // Create new nodes
        for (let bookmark of incoming) {
            let matches = flatBookmarkList.filter(item => item.hash === bookmark.hash);
            if (matches.length === 0) {

                // Find parent node
                let parentId = appNode[0].id;   // Default for direct children
                if (bookmark.parentHash !== '') {
                    // Obviously not optimal but fast enough for now
                    flatBookmarkList = yield getFlattenedBookmarks();

                    parentId = flatBookmarkList.filter(item => item.hash === bookmark.parentHash)[0].localId;
                }

                /*
                 Create bookmark node

                 We know the parent already exists because of:
                 a) how we flattened the bookmarks
                 b) the yield on createAsync

                 In other words, we avoided the race condition by restricting concurrency
                 */
                //noinspection JSUnresolvedFunction
                yield bookmarks.createAsync({
                    parentId: parentId,
                    title: bookmark.title,
                    url: bookmark.url,
                    index: bookmark.index
                });
            }
        }

        lockEvents = false;
    }
);

/*
 Sends an update
 */
let updateRemote = _async(
    function*() {
        if (lockEvents) {
            return;
        }

        let flatBookmarkList = yield getFlattenedBookmarks();
        if (flatBookmarkList === false) {
            return;
        }

        //noinspection JSUnresolvedFunction
        let payload = yield crypto.encryptAsync({
            data: new triplesec.Buffer(JSON.stringify(flatBookmarkList)),
            key: new triplesec.Buffer(encryptionPhrase)
        });

        bucket.update('test11', {"content": payload.toString('hex')}); // Does not expose a callback
    }
);

/*
 Provides a flat representation of a BookmarkTreeNode and all its children nodes recursively
 */
let getFlattenedBookmarks = _async(
    function*() {
        //noinspection JSUnresolvedFunction
        let appNode = yield bookmarks.searchAsync({title: 'privatesync'});
        if (typeof appNode[0] === 'undefined') {
            console.warn('Folder not found');
            return false;
        }

        //noinspection JSUnresolvedFunction
        let appNodeTree = yield bookmarks.getSubTreeAsync(appNode[0].id);
        return flattenTree(appNodeTree);
    }
);

/*
 Flatten a BookmarkTreeNode
 */
function flattenTree(root) {
    let items = [];

    /**
     * Given a tree, creates a bookmark item out of the current node and adds it to the set.
     * Recursively calls itself for the tree's children nodes.
     *
     * @param treeNode The current treeNode (node & its children)
     * @param parentHash The item parent's hash
     * @param keepNode If true-ish, add the created Node to the array
     */
    let buildNodes = function (treeNode, parentHash = '', keepNode = false) {
        let item = {};

        item.title = treeNode.title;
        item.index = treeNode.index;
        item.url = treeNode.url || '';
        item.parentHash = parentHash;
        item.hash = treeNode.hash || hashStr(treeNode.title + treeNode.url + parentHash);
        item.localId = treeNode.id;

        if (keepNode) {
            items.push(item);
        } else {
            item.hash = '';
        }

        if (treeNode.children) {
            for (let n of treeNode.children) {
                buildNodes(n, item.hash, true);
            }
        }
    };

    buildNodes(root[0]);

    return items;
}

/*
 Promisifier helper for Bluebird's PromisifyAll
 */
function chromeBookmarksPromisifier(originalMethod) {
    return function () {
        let args = [].slice.call(arguments);

        return new Promise((resolve) => {
            args.push(resolve);
            originalMethod.apply(this, args);
        });
    };
}

/*
 Fast string hash function based on https://github.com/darkskyapp/string-hash
 */
function hashStr(str) {
    let hash = 5381, i = str.length;

    while (i) {
        hash = (hash * 33) ^ str.charCodeAt(--i);
    }

    return '_' + (hash >>> 0).toString();
}