
function stringfyError(err) {
    let error = { message: err.message }
    if (err && err.message.indexOf("com.rrtimes.rap.vo.BusinessException:") == 0) {
        console.log("接口中未注明抛出业务异常：throws BusinessException;")
        error.message = err.message.split('com.rrtimes.rap.vo.BusinessException:')[1]
    }
    if (err.cause && err.cause.code) {
        error.code = err.cause.code
    }
    if (err.stack) {
        error.stack = err.stack
    } 
    throw (error)
}

function stringifyDate(obj) {
    if (!obj) return obj
    if (obj instanceof Date) {
        return moment(obj).format("YYYY-MM-DD HH:mm:ss")
    }
    else if (Array.isArray(obj)) {
        obj.forEach(stringifyDate)
    }
    else if (obj != null && typeof obj == "object") {
        Object.keys(obj).forEach(k => obj[k] = stringifyDate(obj[k]))
    }
    return obj
}
