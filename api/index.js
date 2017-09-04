const NZD = require('node-zookeeper-dubbo')
const moment = require("moment")
const discovery = require("./discovery")
const { parseObj, regist } = require("./parse")

var config
var nzdServer = null

const api = {
    _init: (current) => {
        config = current
        let services = generateServices(config.discoveryInterfaces, discovery)
        config.dependencies = services
        nzdServer = new NZD(config)
        config.services._delayStart = true
        nzdServer.client.once('connected', function () {
            requestMapper(config.dependencies, nzdServer)
            console.log('Connected to ZooKeeper.')
        });
        serviceProxy(services, api)
    },
    _proxy: serviceProxy,
}

function generateServices(interfaces, template) {
    let services = {}
    if (!interfaces || !Array.isArray(interfaces) || interfaces.length == 0) return services;
    interfaces.forEach(itf => {
        let name = itf.split(".").pop()
        services[name] = Object.assign({}, template, { interface: itf })
    })
    return services
}

function requestMapper(services) {
    let serviceNames = Object.keys(services)
    if (!serviceNames || serviceNames.length == 0) {
        startServer()
        return;
    }
    nzdServer.client.getChildren("/dubbo", null, function (err, children) {
        let method = "interfaceSerializer"
        serviceNames.forEach((itf, index) => {
            if (nzdServer[itf] && nzdServer[itf][method]) {
                nzdServer[itf][method](children).then(apiMapInfo => {
                    console.log(JSON.stringify(apiMapInfo))
                    bindApiMapper(apiMapInfo, nzdServer)
                    if (index == serviceNames.length - 1) {
                        startServer()
                    }
                }).catch(ex => {
                    console.log(ex)
                    if (index == serviceNames.length - 1) {
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
            return regist(itf.name, itf.fields)
        }
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
            itf.methodSignature[methodInfo.name] = function (data) {
                return methodInfo.parameters.map((arg, index) => {
                    let value = data && data[arg.$name] || arguments[index] || data
                    return Object.assign({}, arg, { $: value })
                })
            }
        })
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
        let requestMapping = services[key].requestMapping
        let serviceUrl = requestMapping && requestMapping["@"] || ""
        let apiUrl =  requestMapping && requestMapping[methodName] || ""
        while (serviceUrl.endsWith("/")) serviceUrl = serviceUrl.substring(0, serviceUrl.length - 1)
        //dubbox.api.ILoginService.Ping
        service[methodName] = function () {
            return nzdServer[key][methodName](...arguments)
        }
        if (apiUrl) {
            //dubbox.api.ILoginService_Ping
            let handlerWrapper = api[key + "_" + methodName] = function (data, ctx) {
                var argsInfo = services[key].methodSignature[methodName](data)
                var args = argsInfo.map(arg => parseArgObj(arg, ctx))
                console.log(`call dubbox api : ${key}.${methodName}`)
                return nzdServer[key][methodName](...args).then(stringifyDate).catch(stringfyError)
            }

            handlerWrapper.apiUrl = serviceUrl + apiUrl.replace(/\,/g, "," + serviceUrl)
        }
    }))
}

function stringfyError(err) {
    let error = { message: err.message }
    if (err && err.message.indexOf("com.rrtimes.rap.vo.BusinessException:") == 0) {
        console.log("接口中未注明抛出业务异常：throws BusinessException;")
        error.message = err.message.split('com.rrtimes.rap.vo.BusinessException:')[1]
    }
    if (err.cause && err.cause.code) {
        error.code = err.cause.code
    }
    if (err.stack) {
        error.stack = err.stack
    }
    throw (error)
}

function parseArgObj(arg, ctx) {
    let argValue = arg.$,
        argType = arg.$realClass || arg.$class
    if (arg.$ctx !== undefined && arg.$ctx !== null) {
        argValue = parseArgContext(arg, ctx)
    }
    argValue = parseObj(argValue, argType)
    argValue = argValue && argValue.$ || argValue
    return argValue
}

function parseArgContext(arg, ctx) {
    let argValue = arg.$
    let ctxInfos = arg.$ctx.trim().split(",")
    let argType = arg.$realClass || arg.$class
    let isValueArg = argType && argType.indexOf("java.lang.") == 0

    if (ctxInfos[0] === "") {
        argValue = getCtxKeyValue(ctx, "token")
    } else {
        ctxInfos.map(info => info.trim().split(":")).forEach(info => {
            let argKey = info[0]
            let ctxKey = info[1] || argKey
            let ctxValue = getCtxKeyValue(ctx, ctxKey)
            if (isValueArg) {
                argValue = ctxValue
            } else if (ctxInfos.length == 1 && info.length == 1 && ctxValue != null && typeof ctxValue == "object") {
                argValue = ctxValue
            } else {
                argValue = argValue || {}
                argValue[argKey.trim()] = ctxValue
            }
        })
    }
    return argValue
}

function getCtxKeyValue(ctx, key) {
    if (!ctx._keys) {
        let keys = {
            token: Object.assign({}, ctx.token),
            "query": Object.assign({}, ctx.request.url.query),
            "headers": Object.assign({}, ctx.request.headers),
        }
        Object.assign(keys, ctx.token)
        ctx._keys = keys
    }

    return key == "*" ? ctx._keys : ctx._keys[key]
}

function stringifyDate(obj) {
    if (!obj) return obj
    if (obj instanceof Date) {
        return moment(obj).format("YYYY-MM-DD HH:mm:ss")
    }
    else if (Array.isArray(obj)) {
        obj.forEach(stringifyDate)
    }
    else if (obj != null && typeof obj == "object") {
        Object.keys(obj).forEach(k => obj[k] = stringifyDate(obj[k]))
    }
    return obj
}



module.exports = api