const NZD = require('node-zookeeper-dubbo')
const moment = require("moment")
const services = require("./../services")
const { parseObj, regist } = require("./parse")

var config
var nzdServer = null

const api = {
    _init: (current) => {
        config = current
        config.dependencies = services
        nzdServer = new NZD(config)
        config.services._delayStart = true
        nzdServer.client.once('connected', function () {
            requestMapper(config.mappingApi, nzdServer)
            console.log('Connected to ZooKeeper.')
        });
        serviceProxy(services, api)
    },
    _proxy: serviceProxy,
}

function requestMapper(mappingApi) {
    if (!mappingApi || mappingApi.length == 0) {
        startServer()
        return;
    }
    nzdServer.client.getChildren("/dubbo", null, function (err, children) {
        let itfs = children.join(",")
        mappingApi.forEach((webapi, index) => {
            let itf = webapi.substring(0, webapi.lastIndexOf("."))
            let method = webapi.substr(itf.length + 1)
            if (nzdServer[itf] && nzdServer[itf][method]) {
                nzdServer[itf][method](children).then(apiMapInfo => {
                    // console.log(JSON.stringify(apiMapInfo))
                    bindApiMapper(apiMapInfo, nzdServer)
                    if (index == mappingApi.length - 1) {
                        startServer()
                    }
                }).catch(ex => {
                    console.log(ex)
                    if (index == mappingApi.length - 1) {
                        startServer()
                    }
                })
            }
        })
    })
}

function bindApiMapper(mappers) {
    var apis = {}
    mappers.forEach(itf => {
        if (itf.fields) {
            regist(itf.name, itf.fields)
        } else {
            let key = itf.name.split(".").pop()
            itf.methodSignature = {}
            itf.interface = itf.name
            apis[key] = itf
            itf.methods.forEach(methodInfo => {
                methodInfo.parameters.forEach(arg => {
                    let $class = arg.$class
                    if (!$class) return;
                    if ($class.indexOf("<") != -1) {
                        arg.$realClass = $class
                        arg.$class = $class.split("<")[0]
                    } else if ($class.indexOf("[") > 0) {
                        arg.$realClass = $class
                        arg.$class = "[" + $class.split("[")[0]
                    }
                })
                itf.methodSignature[methodInfo.name] = (data) => methodInfo.parameters.map(
                    arg => Object.assign({}, arg, { $: data && data[arg.$name] || data })
                )
            })
        }
    })
    Object.assign(nzdServer.dependencies, apis)
    serviceProxy(apis, api)
}

function startServer() {
    if (config.services._delayStart) {
        nzdServer._applyServices()
        nzdServer._consumer()
        config.services._delayStart = false
        config.services._start()
    }
}

function serviceProxy(services, api) {
    Object.keys(services).forEach(key => Object.keys(services[key].methodSignature).forEach(method => {
        let methodName = method.name || method
        let service = api[key] = (api[key] || {})
        let serviceUrl = services[key].requestMapping["@"] || ""
        let apiUrl = services[key].requestMapping[methodName] || ""
        while (serviceUrl.endsWith("/")) serviceUrl = serviceUrl.substring(0, serviceUrl.length - 1)
        //dubbox.api.ILoginService.Ping
        service[methodName] = function () {
            return nzdServer[key][methodName](...arguments)
        }
        if (apiUrl) {
            //dubbox.api.ILoginService_Ping
            let handlerWrapper = api[key + "_" + methodName] = function (data, ctx) {
                var argsInfo = services[key].methodSignature[methodName](data)
                var args = argsInfo.map(arg => parseArgObj(arg, ctx.token))
                console.log(`call dubbox api : ${key}.${methodName}`)
                return nzdServer[key][methodName](...args).then(stringifyDate)
            }

            handlerWrapper.apiUrl = serviceUrl + apiUrl.replace(/\,/g, "," + serviceUrl)
        }
    }))
}

function parseArgObj(arg, token) {
    let argValue = arg.$,
        tokenInfo = arg.$token,
        argType = arg.$realClass || arg.$class
    if (tokenInfo !== undefined && tokenInfo !== null && token) {
        tokenInfo = tokenInfo.trim()
        if (tokenInfo === "") {
            argValue = token
        }
        else if (tokenInfo.indexOf(",") != -1 || tokenInfo.indexOf(":") != -1) {
            argValue = argValue || {}
            tokenInfo.split(",").map(info => info.trim().split(":")).forEach(info => {
                let argKey = info[0]
                let tokenKey = info[1] || argKey
                argValue[argKey.trim()] = token[tokenKey.trim()]
            })
        } else if (argType && argType.indexOf("java.lang.") == 0) {
            argValue = token[tokenInfo]
        } else {
            argValue[tokenInfo] = token[tokenInfo]
        }
    }
    argValue = parseObj(argValue, argType)
    argValue = argValue && argValue.$ || argValue
    return argValue
}

function stringifyDate(obj) {
    if (!obj) return obj
    if (obj instanceof Date) {
        return moment(obj).format("YYYY-MM-DD HH:mm:ss")
    }
    else if (Array.isArray(obj)) {
        obj.forEach(stringifyDate)
    }
    else if (typeof obj == "object") {
        Object.keys(obj).forEach(k => obj[k] = stringifyDate(obj[k]))
    }
    return obj
}



module.exports = api