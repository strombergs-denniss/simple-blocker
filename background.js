const ALLOWED = [
    'youtube\\.com/c/',
    'youtube\\.com/(watch|channel|user|playlist|results|account|shorts)',
    'youtube\\.com/feed/(channels|library|history)',
    'twitch\\.tv/.+',
    'google\\.com',
    'twitter\\.com/.+'
]

const DENIED = [
    'youtube\\.com',
    'twitter\\.com',
    'twitter\\.com',
    'twitch\\.tv'
]

const Filter = {
    blockTab: function() {
        document.body.innerHTML = ''
    },
    blockTabElements: function(url) {
        if (url.includes('youtube.com/watch')) {
            const element = document.querySelector('#columns #secondary #related')

            if (element) {
                element.innerHTML = ''
            }
        }
    },
    isUrlAllowed: function(url) {
        return !((DENIED.some(a => new RegExp(a).test(url))) && !ALLOWED.some(a => new RegExp(a).test(url)))
    },
    isTabBlocked: function(tab) {
        if (!this.isUrlAllowed(tab.url)) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: this.blockTab,
                args: [tab.url]
            })
        } else {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: this.blockTabElements,
                args: [tab.url]
            })
        }
    }
}

function onActivated(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, tab => {
        if (Filter.isTabBlocked(tab)) {
            return
        }
    })
}

function onCommitted(details) {
    if (details.transitionType === 'reload') {
        chrome.tabs.get(details.tabId, tab => {
            if (tab.active) {
                Filter.isTabBlocked(tab)
            }
        })
    }
}

function onUpdated(tabId, changeInfo, tab) {
    if (
        tab.active &&
        changeInfo.hasOwnProperty('url') &&
        changeInfo.status === 'loading'
    ) {
        if (Filter.isTabBlocked(tab)) {
            return
        }
    }
}

chrome.tabs.onActivated.addListener(onActivated)

chrome.webNavigation.onCommitted.addListener(onCommitted)

chrome.tabs.onUpdated.addListener(onUpdated)
