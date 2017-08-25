module.exports = {
   "interface": "com.rrtimes.user.itf.ILoginService",
   "methodSignature": { 
    "interfaceSerializer": (className) => [ {"$class": "[java.lang.String", "$": className, "$name": "interfaceNames"} ], 
    "testTokenID": (userId) => [ {"$class": "java.lang.Long", "$": userId, "$name": "userId", "$token": "userId"} ],
    "testTokenObject": (user) => [ {"$class": "com.rrtimes.user.vo.SysUser", "$": user, "$name": "user", "$token": "id:userId"} ],
    "testToken": (token) => [ {"$class": "com.rrtimes.rap.vo.Token", "$": token, "$name": "token", "$token": ""} ],
    },
  "requestMapping":{ 
    "@": "/user",
    "interfaceSerializer": "/interfaceSerializer",
    "testTokenID": "/testTokenID",
    "testTokenObject": "/testTokenObject",
    "testToken": "/testToken",
    }
 }