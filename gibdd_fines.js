const puppeteer = require('puppeteer')
const { getV3Token, reportAnswer } = require('./solverv3.js')
var qs = require('querystring')

const targetUrl = 'https://xn--90adear.xn--p1ai/check/fines'

const attemptsLimit = 10
const interceptUrls = [
    {
        url: 'https://xn--b1afk4ade.xn--90adear.xn--p1ai/proxy/check/fines',
        action: 'check_fines',
        attempts: 0,
        success: false
    }
]

let params = {
    action: undefined,
    min_score: '0.9',
    googlekey: '6Lc66nwUAAAAANZvAnT-OK4f4D_xkdzw5MLtAYFL',
    pageurl: 'https://xn--90adear.xn--p1ai/check/fines'
    // pageurl: 'http://xn--b1afk4ade.xn--90adear.xn--p1ai/'
}

const formFillData = {
    checkFinesRegnum: 'К097АВ',
    checkFinesRegreg: '136',
    checkFinesStsnum: '3627162475'
}

const browserParams = {
    headless: false,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
    ],
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' //let's use real chrome instead of Chromium
}

const checkUrl = (url) => {
    let match = interceptUrls.find(u => u.url === url)
    if (!match) return false
    return match
}

let currentLink = 0

let doThat = async (browser) => {
    const page = await browser.newPage()

    const clickTheLink = async (ind) => {
        try {
            await page.evaluate(i => {
                if (i < document.querySelectorAll('a.checker').length) {
                    document.querySelectorAll('a.checker')[i].click()
                }
            }, ind)
        } catch (e) {
            console.log(e)
        }
    }

    page.on('request', async (r) => {
        let urlObj = checkUrl(r.url())
        if (r.method() === 'POST' && urlObj) {
            params.action = urlObj.action
            let captcha = await getV3Token(params)
            try {
                console.log('request intercepted')
                const initData = r.postData()
                const parsedData = qs.parse(initData)
                parsedData.reCaptchaToken = captcha.token
                qs.stringify(parsedData)
                await r.continue({ postData: qs.stringify(parsedData) })
                urlObj.attempts++
                console.log('Link: ' + currentLink + ' attempt: ' + urlObj.attempts)
                const finalResponse = await page.waitForResponse(response => response.url() === r.url() && response.status() === 200, { timeout: 180 * 1000 })
                const data = await finalResponse.json()
                console.log(data)
                if (data.code === 200) {
                    urlObj.success = true
                    console.log("passed: " + captcha.id)
                    await reportAnswer(captcha.id, true)
                    await page.close()
                } else {
                    console.log("failed: " + captcha.id)
                    await reportAnswer(captcha.id, false)
                    await page.waitFor(500)
                    if (urlObj.attempts < attemptsLimit) {
                        clickTheLink(currentLink)
                    }
                }
            } catch (e) {
                console.log('Huston we have a problem: ' + e)
            }
        } else {
            r.continue()
        }
    })

    await page.setViewport({
        width: 1200,
        height: 1000
    })
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36')
    await page.setRequestInterception(true)
    await page.goto(targetUrl);
    await page.waitFor(2500)

    try {
        await page.focus('#checkFinesRegnum')
        for (var field in formFillData) {
            await page.focus('#' + field)
            await page.waitFor(500)
            await page.type('#' + field, formFillData[field], { delay: 100 })
        }
    } catch (e) {
        await page.goBack()
        await page.goForward()
    }
    clickTheLink(currentLink)
}

puppeteer.launch(browserParams)
    .then((browser) => {
        doThat(browser).catch(e => {
            console.log(e)
        })
    })