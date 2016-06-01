/* global chrome */

//noinspection JSUnresolvedVariable
let local = chrome.storage.local;
//noinspection JSUnresolvedVariable
let extension = chrome.extension;

function save_options() {
    let encphrase = document.getElementById('encphrase').value;
    let apikey = document.getElementById('apikey').value;
    let appid = document.getElementById('appid').value;

    local.set({
        encphrase: encphrase,
        apikey: apikey,
        appid: appid
    }, function() {
        let status = document.getElementById('status');
        status.textContent = 'Settings Saved.';
        setTimeout(function() {
            status.textContent = '';
        }, 750);

        // Reload but allow the visual indication to appear shortly
        setTimeout(function() {
            extension.sendRequest({reload: true});
        }, 1200);
    });
}

function restore_options() {
    local.get({
        encphrase: '',
        apikey: '',
        appid: ''
    }, function(items) {
        document.getElementById('encphrase').value = items.encphrase;
        document.getElementById('appid').value = items.appid;
        document.getElementById('apikey').value = items.apikey;
    });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);