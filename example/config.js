/**
 * server配置
 * 
 */

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
    },
    configs: {
        // serviceName: {} 
        //http://localhost:8086/v1/user/ping?java2js=1&itf=com.rrtimes.user.itf.ILoginService
        dubbo: {
            application: {
                name: "mk-server"
            },
            register: "zookeeper.rrtimes.com:2181",
            dubboVer: "2.8.4a",
            group: 'LISGA-PC',
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
