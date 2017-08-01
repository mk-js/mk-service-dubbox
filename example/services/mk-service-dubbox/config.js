
const config = (options) => {
	Object.assign(current, options)
	return current
}

const current = {
	apiPrefix: "dubbo",
	application: {
		name: "xr-service"
	},
	register: "zookeeper.rrtimes.com:2181",
	dubboVer: "2.8.4a",
	group: 'LISGA-PC',
	timeout: 6000,
}

module.exports = Object.assign(config, {
	current,
})
