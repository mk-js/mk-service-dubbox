var Long = require("long");

var SERIALIZER_MAP = {};

[
    'boolean',
    'bool',
].forEach(function (t) {
    SERIALIZER_MAP[t] = 'bool';
});
[
    'java.lang.Boolean',
].forEach(function (t) {
    SERIALIZER_MAP[t] = 'Bool';
});

[
    'double',
    'float',
].forEach(function (t) {
    SERIALIZER_MAP[t] = 'double';
});

[
    'java.lang.Double',
    'java.lang.Float',
].forEach(function (t) {
    SERIALIZER_MAP[t] = 'Double';
});

[
    'long',
].forEach(function (t) {
    SERIALIZER_MAP[t] = 'long';
});

[
    'java.lang.Long',
].forEach(function (t) {
    SERIALIZER_MAP[t] = 'Long';
});

[
    'short',
    'int',
    'byte',
].forEach(function (t) {
    SERIALIZER_MAP[t] = 'int';
});
[
    'java.lang.Short',
    'java.lang.Integer',
    'java.lang.Byte',
].forEach(function (t) {
    SERIALIZER_MAP[t] = 'Int';
});

[
    'string',
    'char',
    'char[]',
].forEach(function (t) {
    SERIALIZER_MAP[t] = 'string';
});

[
    'String',
    'java.lang.String',
    'java.lang.Character',
].forEach(function (t) {
    SERIALIZER_MAP[t] = 'String';
});

[
    'java.util.List',
].forEach(function (t) {
    SERIALIZER_MAP[t] = 'Array';
});
[
    'java.util.Date',
    'java.sql.Timestamp'
].forEach(function (t) {
    SERIALIZER_MAP[t] = 'Date';
});

var SERIALIZER = {
    'bool': obj => Boolean(obj),
    'Bool': obj => obj == null ? null : Boolean(obj),
    'double': obj => Number(obj),
    'Double': obj => obj == null ? null : Number(obj),
    'long': obj => patchForHessian(obj),
    'Long': obj => obj == null ? null : patchForHessian(obj),
    'int': obj => Number(obj),
    'Int': obj => obj == null ? null : Number(obj),
    'string': obj => String(obj),
    'String': obj => obj == null ? null : String(obj),
    'Date': obj => obj == null ? null : new Date(obj),
    'Array': obj => obj && Array.from(obj),
}

function patchForHessian(obj) {
    if (!obj && obj != 0) return obj
    obj = Long.fromValue(obj)
    if (obj.high == 0 && obj.low < 20) {
        obj.length = obj.low.toString().length
    }
    return obj
}

const parseObj = function (obj, typeName, isFullFields) {

    let serializerName = SERIALIZER_MAP[typeName]
    if (SERIALIZER[serializerName]) {
        return SERIALIZER[serializerName](obj, isFullFields)
    } else {
        return obj
    }

}
const regist = function (typeName, fields) {
    if (SERIALIZER_MAP[typeName]) return;
    let fun = fields
    if (fields && typeof fun != "function") {
        if (typeName.indexOf("List<") != -1 || typeName.indexOf("[") != -1) {
            fun = seralizerArray(fields, typeName)
        } else {
            fun = seralizerObj(fields, typeName)
        }
    }
    SERIALIZER_MAP[typeName] = typeName
    SERIALIZER[typeName] = fun
}

const seralizerArray = (fields, typeName) => (obj) => {
    if (!obj) return obj;
    let realTypeName = typeName
    if (typeName.indexOf("List<") != -1) {
        realTypeName = typeName.replace(">", "").split("<")[1]
    } else if (typeName.indexOf("[") == 0) {
        realTypeName = typeName.substr(1)
    } else if (typeName.indexOf("[") != -1) {
        realTypeName = typeName.split("[")[0]
    }
    let result = []; 
    obj.forEach((data, index) => {
        let isFullFields = (index === 0)
        result.push(parseObj(data, realTypeName, isFullFields))
    })
    return result
}

const seralizerObj = (fields, typeName) => (obj, isFullFields) => {
    if (!obj) return obj;
    let result = {}
    Object.keys(obj).forEach(k => {
        let typeName = fields[k] || fields["*"]
        if (!typeName) return;
        let value = obj[k]
        let serializerName = SERIALIZER_MAP[typeName]
        if (SERIALIZER[serializerName]) {
            result[k] = SERIALIZER[serializerName](value)
        } else {
            console.warn("parse.js,未找到类型对应的序列化方法,类型：" + typeName)
            result[k] = value
        }
    })
    if (isFullFields === true) {
        Object.keys(fields).filter(f => !obj.hasOwnProperty(f)).forEach(f => {
            if (f.indexOf(".") != -1) {
                obj[f] = undefined
            } else {
                let typeName = fields[f]
                let serializerName = SERIALIZER_MAP[typeName]
                if (SERIALIZER[serializerName]) {
                    result[f] = SERIALIZER[serializerName](undefined)
                } else {
                    console.warn("parse.js,未找到类型对应的序列化方法,类型：" + typeName)
                    result[f] = undefined
                }
            }
        })
    }
    if (typeName.indexOf("java.util.Map<") != -1) {
        typeName = "java.util.Map"
    }
    return { $class: typeName, $: result }
}

module.exports = {
    parseObj,
    regist,
}