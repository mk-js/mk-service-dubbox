const NZD = require('node-zookeeper-dubbo');
const services = require("./services")

var config
var nzd = null

const api = {
    _init: (current) => {
        config = current
        config.dependencies = services
        nzd = new NZD(config)
        proxy(services, api)
    },
    proxy: proxy,
}

function proxy(services, api) {
    Object.keys(services).forEach(key => Object.keys(services[key].methodSignature).forEach(methodName => {
        let service = api[key] = (api[key] || {})
        let serviceUrl = services[key].requestMapping["@"] || ""
        let apiUrl = services[key].requestMapping[methodName] || ""
        //dubbox.api.ILoginService.Ping
        service[methodName] = function () {
            return nzd[key][methodName](...arguments)
        }
        if (apiUrl) {
            //dubbox.api.ILoginService_Ping
            api[key + "_" + methodName] = function (data, ctx) {
                var argsInfo = services[key].methodSignature[methodName]()
                var args = argsInfo.map(arg => {
                    let argValue = data[arg.$name]
                    let tokenInfo = arg.$token
                    if (tokenInfo !== undefined && ctx.token) { 
                        if (tokenInfo === "") {
                            argValue = ctx.token 
                        }
                        else if (tokenInfo.indexOf(",") != -1 || tokenInfo.indexOf(":") != -1) {
                            argValue = argValue || {}
                            tokenInfo.split(",").map(info => info.trim().split(":")).forEach(info => {
                                let argKey = info[0]
                                let tokenKey = info[1] || argKey
                                argValue[argKey.trim()] = ctx.token[tokenKey.trim()]
                            })
                        } else {
                            argValue = ctx.token[tokenInfo.trim()]
                        }
                    }
                    return argValue
                })
                nzd[key][methodName](...args)
                    .then(result => {
                        ctx.return(result)
                    })
                    .catch(ex => {
                        ctx.error(ex)
                    })
            }
            api[key + "_" + methodName].apiUrl = serviceUrl + apiUrl.replace(/\,/g, "," + serviceUrl)
        }
    }))
}
module.exports = api