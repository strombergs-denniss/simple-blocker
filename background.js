function mToMs(m) {
    return m * 60 * 1000
}

const DENIED = false
const ALLOWED = true
const INTERVAL = 1000
const STATE = {}

const WEBSITES = {
    'youtube\\.com': {
        access: DENIED,
        allowed: [
            '/c/',
            '/(watch|channel|user|playlist|results|account)',
            '/feed/(channels|library|history)'
        ],
        denied: [],
        isTimeLimitEnabled: false,
        defaultTimeLimit: 0,
        elementBlocker: url => {
            const elements = document.querySelectorAll('#columns #secondary #related, ytd-topbar-logo-renderer, ytd-notification-topbar-button-renderer, ytd-mini-guide-renderer, #owner #subscribe-button')

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
    'twitter\\.com': {
        access: DENIED,
        allowed: [
            '/(?!home|explore)'
        ],
        denied: [],
        isTimeLimitEnabled: false,
        defaultTimeLimit: 0,
        elementBlocker: url => {}
    },
    'twitch\\.tv': {
        access: DENIED,
        allowed: [],
        denied: [],
        isTimeLimitEnabled: false,
        defaultTimeLimit: 0,
        elementBlocker: url => {}
    },
    'tiktok\\.com': {
        access: DENIED,
        allowed: [],
        denied: [],
        isTimeLimitEnabled: false,
        defaultTimeLimit: 0,
        elementBlocker: url => {}
    },
    'nitter\\.net': {
        access: DENIED,
        allowed: [],
        denied: [],
        isTimeLimitEnabled: true,
        defaultTimeLimit: mToMs(30),
        elementBlocker: url => {}
    },
    'reddit\\.com': {
        access: DENIED,
        allowed: [],
        denied: [],
        isTimeLimitEnabled: true,
        defaultTimeLimit: mToMs(60),
        elementBlocker: url => {}
    }
}

function blockPage(url) {
    if (url.includes('youtube.com')) {
        document.body.innerHTML = ''
        window.location.pathname = '/results'
    } else {
        document.body.innerHTML = '<div style="font-size: 72px; height: 100vh; display: flex; justify-content: center; align-items: center;">STOP WASTING TIME DUMBASS!</div>'
    }
}

function formatTime(ms) {
    const date = new Date(0)
    date.setMilliseconds(ms)

    const hours = date.getUTCHours()
    const minutes = date.getUTCMinutes()
    const seconds = date.getUTCSeconds()

    if (!hours && !minutes) {
        return `${ seconds }`
    }

    return `${ hours }:${ minutes }`
}

function reset(state) {
    state.tabId = null
    state.url = ''
    state.key = ''
    state.limit = 0
    state.time = 0
    state.timer = null
}

async function updateTime(key, time) {
    const data = await chrome.storage.local.get(key)
    const value = data[key] || 0
    data[key] = time > value ? time : value
    await chrome.storage.local.set(data)
}

function interval() {
    STATE.time += INTERVAL

    if (STATE.time >= STATE.limit) {
        clearInterval(STATE.timer)
        chrome.scripting.executeScript({
            target: { tabId: STATE.tabId },
            function: blockPage,
            args: [STATE.url]
        })
        chrome.action.setBadgeText({ text: '' });
    } else {
        chrome.action.setBadgeText({ text: formatTime(STATE.limit - STATE.time) });
    }
}

function blockWebsite(tab) {
    for (const key in WEBSITES) {
        if (new RegExp(key).test(tab.url)) {
            const website = WEBSITES[key]

            if (
                (website.access === DENIED && !website.allowed.some(a => new RegExp(key + a).test(tab.url))) ||
                (website.access === ALLOWED && website.denied.some(a => new RegExp(key + a).test(tab.url)))
            ) {
                if (website.isTimeLimitEnabled) {
                    if (!STATE.timer) {
                        STATE.key = key
                        STATE.tabId = tab.id
                        STATE.url = tab.url

                        chrome.storage.local.get(key, data => {
                            const value = data[key] || 0
                            STATE.time = value
                            STATE.limit = website.defaultTimeLimit

                            if (STATE.time >= STATE.limit) {
                                chrome.scripting.executeScript({
                                    target: { tabId: tab.id },
                                    function: blockPage,
                                    args: [tab.url]
                                })
                            } else {
                                STATE.timer = setInterval(interval, INTERVAL);
                            }
                        })
                    }
                } else {
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        function: blockPage,
                        args: [tab.url]
                    })
                }
            } else {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: website.elementBlocker,
                    args: [tab.url]
                })
            }

            break;
        }
    }
}

function onActivated(activeInfo) {
    if (STATE.timer) {
        clearInterval(STATE.timer)
        updateTime(STATE.key, STATE.time)
        reset(STATE)
        chrome.action.setBadgeText({ text: '' });
    }

    chrome.tabs.get(activeInfo.tabId, tab => {
        blockWebsite(tab)
    })
}

function onCommitted(details) {
    if (details.transitionType === 'reload') {
        chrome.tabs.get(details.tabId, tab => {
            if (tab.active) {
                blockWebsite(tab)
            }
        })
    }
}

function onUpdated(_, changeInfo, tab) {
    if (
        tab.active &&
        changeInfo.hasOwnProperty('url') &&
        changeInfo.status === 'loading'
    ) {
        blockWebsite(tab)
    }
}

chrome.tabs.onActivated.addListener(onActivated)

chrome.webNavigation.onCommitted.addListener(onCommitted)

chrome.tabs.onUpdated.addListener(onUpdated)
