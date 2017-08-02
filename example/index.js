const { config, start } = require("mk-server")
const serverConfig = require("./config")

const dubbox = require("./services/mk-service-dubbox/index.js")

const services = { 
    dubbox,
}

config(serverConfig({ services }))

start()