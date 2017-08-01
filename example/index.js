const { config, start } = require("mk-server")
const serverConfig = require("./config")

const mk_service_dubbox = require("./services/mk-service-dubbox/index.js")

const services = { 
    mk_service_dubbox,
}

config(serverConfig({ services }))

start()