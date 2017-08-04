module.exports = {
   "interface": "com.rrtimes.user.itf.ILoginService",
   "methodSignature": { 
    "login": (sysUser) => [ {"$class": "com.rrtimes.user.vo.SysUser", "$": sysUser, "$name": "sysUser"} ],
    "loginById": (userId) => [ {"$class": "java.lang.Long", "$": userId, "$name": "userId"} ],
    "java2js": (className) => [ {"$class": "java.lang.String", "$": className, "$name": "className"} ],
    "Ping": (type, value) => [ {"$class": "java.lang.String", "$": type, "$name": "type"}, {"$class": "[int", "$": value, "$name": "value"} ],
    "testTokenID": (userId) => [ {"$class": "java.lang.Long", "$": userId, "$name": "userId", "$token": "userId"} ],
    "testTokenObject": (user) => [ {"$class": "com.rrtimes.user.vo.SysUser", "$": user, "$name": "user", "$token": "id:userId"} ],
    "testToken": (token) => [ {"$class": "com.rrtimes.rap.vo.Token", "$": token, "$name": "token", "$token": ""} ],
    },
  "requestMapping":{ 
    "@": "/user",
    "login": "/login",
    "java2js": "/java2js",
    "Ping": "/ping",
    "testTokenID": "/testTokenID",
    "testTokenObject": "/testTokenObject",
    "testToken": "/testToken",
    }
 }