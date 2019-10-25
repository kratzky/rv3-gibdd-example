var request = require('request-promise')

const api = {
    in: 'http://rucaptcha.com/in.php',
    res: 'http://rucaptcha.com/res.php',
    key: 'YOUR_API_KEY'
}

let params = {}


const getAnswer = (captchaId) => {
    return new Promise((resolve, reject) => {
        var qs = {
            key: api.key,
            json: 1,
            action: 'get',
            id: captchaId,
        }
        var options = {
            uri: api.res,
            qs,
            json: true
        }

        request(options)
            .then((res) => {
                if (res.status === 1) {
                    resolve(res.request)
                } else {
                    reject(res.request)
                }
            }).catch((e) => {
                reject(e)
            })
    })
}

const submitCaptcha = () => {
    return new Promise((resolve, reject) => {
        var qs = {
            key: api.key,
            json: 1,
            soft_id: '2496',
            method: 'userrecaptcha',
            version: 'v3',
            action: params.action,
            min_score: params.min_score,
            googlekey: params.googlekey,
            pageurl: params.pageurl
        }
        var options = {
            uri: api.in,
            qs,
            json: true
        }

        request(options)
            .then((res) => {
                if (res.status === 1) {
                    resolve(res.request)
                } else {
                    reject(res.request)
                }
            }).catch((e) => {
                reject(e)
            })
    })
}


var solveMyCaptcha = (captchaId) => {
    return new Promise((resolve, reject) => {
        var loop = setInterval(async () => {
            try {
                var answer = await getAnswer(captchaId)
                clearInterval(loop)
                resolve(answer)
            } catch (e) {
                if (e != 'CAPCHA_NOT_READY') {
                    clearInterval(loop)
                    reject(e)
                }
            }
        }, 5000)
    })
}


const getV3Token = async (options) => {
    params = options
    try {
        var id = await submitCaptcha()
        try {
            var token = await solveMyCaptcha(id)
            return {
                token,
                id
            }
        } catch (e) {
            throw e
        }
    } catch (e) {
        throw e
    }
}


const reportAnswer = (id, success) => {
    return new Promise((resolve, reject) => {
        var qs = {
            key: api.key,
            json: 1,
            action: success ? 'reportgood' : 'reportbad',
            id: id,
        }
        var options = {
            uri: api.res,
            qs,
            json: true
        }

        request(options)
            .then((res) => {
                if (res.status === 1) {
                    resolve(res.request)
                } else {
                    reject(res.request)
                }
            }).catch((e) => {
                reject(e)
            })
    })
}



module.exports = { getV3Token, reportAnswer }