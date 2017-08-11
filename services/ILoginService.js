module.exports = {
   "interface": "com.rrtimes.user.itf.ILoginService",
   "methodSignature": { 
    "java2js": (className) => [ {"$class": "java.lang.String", "$": className, "$name": "className"} ],
    "testTokenID": (userId) => [ {"$class": "java.lang.Long", "$": userId, "$name": "userId", "$token": "userId"} ],
    "testTokenObject": (user) => [ {"$class": "com.rrtimes.user.vo.SysUser", "$": user, "$name": "user", "$token": "id:userId"} ],
    "testToken": (token) => [ {"$class": "com.rrtimes.rap.vo.Token", "$": token, "$name": "token", "$token": ""} ],
    },
  "requestMapping":{ 
    "@": "/user",
    "java2js": "/java2js",
    "testTokenID": "/testTokenID",
    "testTokenObject": "/testTokenObject",
    "testToken": "/testToken",
    }
 }