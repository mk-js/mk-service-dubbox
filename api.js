const NZD = require('node-zookeeper-dubbo');
const services = require("./services")

var config
var nzdMeta = null
var nzdService = null

const api = {
    _init: (current) => {
        config = current
        config.dependencies = services
        nzdService = nzdMeta = new NZD(config)
        config.services._delayStart = true
        nzdMeta.client.once('connected', function () {
            requestMapper(config.mappingApi, nzdMeta)
            console.log('Connected to ZooKeeper.');
        });
        proxy(services, api)
    },
    _proxy: proxy,
}

function requestMapper(mappingApi, nzdServer) {
    if (!mappingApi || mappingApi.length == 0) return;
    nzdServer.client.getChildren("/dubbo", null, function (err, children) {
        let itfs = children.join(",")
        mappingApi.forEach(api => {
            let itf = api.substring(0, api.lastIndexOf("."))
            let method = api.substr(itf.length + 1)
            nzdServer[itf][method](itfs).then(mappingInfo => {
                bindMapper(JSON.parse(mappingInfo), nzdServer)
            })
        })
    })
}

function bindMapper(mappers, nzdServer) {
    var apis = {}
    mappers.forEach(itf => {
        let key = itf.interface.split(".").pop()
        apis[key] = itf
        Object.keys(itf.methodSignature).forEach(m => {
            let arr = itf.methodSignature[m]
            itf.methodSignature[m] = (data) => arr.map(arg => Object.assign({}, arg, { $: data && data[arg.$name] || arr.length == 1 && data }))
        })
    })
    Object.assign(nzdServer.dependencies, apis)
    nzdServer._applyServices()
    nzdServer._consumer()
    proxy(apis, api)
    config.services._delayStart = false
    config.services._start()
}

function proxy(services, api) {
    Object.keys(services).forEach(key => Object.keys(services[key].methodSignature).forEach(methodName => {
        let service = api[key] = (api[key] || {})
        let serviceUrl = services[key].requestMapping["@"] || ""
        let apiUrl = services[key].requestMapping[methodName] || ""
        while (serviceUrl.endsWith("/")) serviceUrl = serviceUrl.substring(0, serviceUrl.length - 1)
        //dubbox.api.ILoginService.Ping
        service[methodName] = function () {
            return nzdService[key][methodName](...arguments)
        }
        if (apiUrl) {
            //dubbox.api.ILoginService_Ping
            let handlerWrapper = api[key + "_" + methodName] = function (data, ctx) {
                var argsInfo = services[key].methodSignature[methodName](data)
                var args = argsInfo.map(arg => {
                    let argValue = data && data[arg.$name] || argsInfo.length == 1 && data
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
                console.log(`call dubbox api : ${key}.${methodName}`)
                return nzdService[key][methodName](...args)
            }

            handlerWrapper.apiUrl = serviceUrl + apiUrl.replace(/\,/g, "," + serviceUrl)
        }
    }))
}
module.exports = api