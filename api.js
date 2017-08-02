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
        let apiUrl = services[key].requestMapping[methodName]
        //dubbox.api.ILoginService.Ping
        service[methodName] = function () {
            return nzd[key][methodName](...arguments)
        }
        if (apiUrl) {
            //dubbox.api.ILoginService_Ping
            api[key + "_" + methodName] = function (data, ctx) {
                var argsInfo = services[key].methodSignature[methodName]()
                var args = argsInfo.map(arg => data[arg.$name])
                nzd[key][methodName](...args)
                    .then(result => {
                        ctx.return(result)
                    })
                    .catch(ex => {
                        ctx.error(ex)
                    })
            }
            api[key + "_" + methodName].apiUrl = apiUrl
        }
    }))
}
module.exports = api