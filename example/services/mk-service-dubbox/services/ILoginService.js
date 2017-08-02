module.exports = {
  "interface": "com.rrtimes.user.itf.ILoginService",
  "requestMapping": {
    "login": "/user/login",
    "Ping": "/user/ping",
  },
  "methodSignature": {
    "login": (sysUser) => [{ "$class": "com.rrtimes.user.vo.SysUser", "$": sysUser }],
    "Ping": (type, value) => [{ "$class": "java.lang.String", "$": type }, { "$class": "[int", "$": value }],
  }
}
