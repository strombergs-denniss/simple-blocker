# Simple Blocker

A simple chrome extension which partially or completely blocks some time exploitative websites like YouTube, Twitter, TikTok and others.
For youtube it only blocks certain pages and elements that make you consume more videos but leaves it as usable platform for searching and watching individual videos.

## Installation
* Go to chrome://extensions/
* Enable `Developer mode`
* Drag and drop already packaged **simple-blocker.crx** file or [package it yourself](https://developer.chrome.com/docs/extensions/mv3/linux_hosting/#create) and then install

## Forcing extension
To prevent extension from getting deleted or disabled, you need to create a managed policy.

### Linux
* Copy file `policy.json` into `/etc/opt/chrome/policies/managed/`
* Update `ExtensionInstallForcelist` value with relevant extension IDs, this value determines which extensions will be forcefully installed and enabled.
* There are also additional policies to disable incognito mode, guest mode, and ability to add new users.
* To see which policies are active go to `chrome://policy/`

## TODO
* Add custom config as option
