const ALLOWED = [
    'youtube\\.com/c/',
    'youtube\\.com/(watch|channel|user|playlist|results|account)',
    'youtube\\.com/feed/(channels|library|history)',
    'twitter\\.com/(?!home|explore)'
]

const DENIED = [
    'youtube\\.com',
    'twitter\\.com',
    'twitch\\.tv',
    'nitter\\.net'
]

const Filter = {
    blockTab: function(url) {
        if (url.includes('youtube.com')) {
            document.body.innerHTML = ''
            window.location.pathname = '/results'
        } else {
            document.body.innerHTML = '<div style="font-size: 72px; height: 100vh; display: flex; justify-content: center; align-items: center;">STOP WASTING TIME DUMBASS!</div>'
        }
    },
    blockTabElements: function(url) {
        if (url.includes('youtube.com')) {
            const elements = document.querySelectorAll('#columns #secondary #related, ytd-topbar-logo-renderer, ytd-notification-topbar-button-renderer, ytd-mini-guide-renderer')

            for (const element of elements) {
                element.innerHTML = ''
            }

            const navButtons = document.querySelectorAll('ytd-guide-section-renderer:first-child .style-scope.ytd-guide-section-renderer#items ytd-guide-entry-renderer')

            for (let a = 0; a < 4; ++a) {
                const navButton = navButtons[a]

                if (navButton) {
                    navButton.innerHTML = ''
                }
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
