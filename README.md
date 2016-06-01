# Zero-Knowledge Sync & Share for Chrome
#### Think Mozilla Sync for Chrome in ~ 200 lines of code

## TL;DR

Safe data sync/share among your devices/friends without trusting a third-party


## What is currently does on v. 01:

* Encrypts all the bookmarks in a folder on computer A
* Decrypts all the bookmarks in a folder on computer B
* Syncs the contents
* Works both ways
* For N computers

## Huh?

* You install the extension.
* You add your bookmarks on the "privatesync" folder
* You install the extension on another computer/browser and create a "privatesync" folder.
* The bookmarks you created before get synced here.
* The data was transparently encrypted/decrypted on the client-side only

## Huh???

Watch the [gif](http://gph.is/1TXYmvO) (1min 45sec)

![](http://i.giphy.com/3o72Fk4chYz3GigwbS.gif)

## What more?

* In the next interations, we will be able to have multiple isolated folders with their unique key. This means that we can share different directories with different people.
* Currently, the changes are "two-way". We will be able to have "one-way" syncing/sharing - i.e. with read-only keys.

## How?

All encryption is done client-side with Keybase's [Triplesec](https://keybase.io/triplesec/)

The syncing is done leveraging Automattic's [Simperium](https://simperium.com) API (which has a generous free tier).

## Installation

Later versions will come with a packed extension "release". For now, these are the dev steps:

### Prerequisites

* Node
* Gulp

### Steps

a) First you download and build:

````bash
git clone https://github.com/kapolos/0sync.git
cd 0sync
npm i
gulp
````

b) Then go to Chrome extensions, enable the developer mode and select the directory to load the extension.

c) Register a free account on Simperium and create a new App. Copy the App's ID and the Admin Token ro the extension's Options page

d) Choose a nice encryption phrase on the Options page

e) Have fun!
