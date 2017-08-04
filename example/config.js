/**
 * server配置
 * 
 */
const auth = require("mk-service-auth")

const config = ({ services }) => {
    Object.assign(server.services, services)
    configServices(server)
    return server
}

const server = {
    host: "0.0.0.0",
    port: 8000,
    apiRootUrl: "/v1",
    interceptors: [],
    services: {
        // referrenced service
        auth,
    },
    configs: {
        // serviceName: {} 
        auth: {
            key: "token/Key",
            tokenKeys: ['userId', 'orgId'],
            exclude: ['/user/login', '/user/ping', '/user/create'],
        },
        //http://localhost:8086/v1/user/ping?java2js=1&itf=com.rrtimes.user.itf.ILoginService
        dubbox: {
            application: {
                name: "mk-server"
            },
            register: "localhost:2181",
            dubboVer: "2.8.4",
            group: '',
            timeout: 6000,
        },
    },
}

function configServices(server) {
    var { services, configs } = server;
    Object.keys(services).filter(k => !!services[k].config).forEach(k => {
        let curCfg = Object.assign({ server, services }, configs["*"], configs[k]);
        services[k].config(curCfg);
    })
}

module.exports = config
