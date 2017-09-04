var Long = require("long");

var SERIALIZER_MAP = {};

[
    'boolean',
    'java.lang.Boolean',
    'bool',
].forEach(function (t) {
    SERIALIZER_MAP[t] = 'Bool';
});

[
    'double',
    'java.lang.Double',
    'float',
    'java.lang.Float',
].forEach(function (t) {
    SERIALIZER_MAP[t] = 'Double';
});

[
    'java.lang.Long',
    'long',
].forEach(function (t) {
    SERIALIZER_MAP[t] = 'Long';
});

[
    'short',
    'java.lang.Short',
    'int',
    'java.lang.Integer',
    'byte',
    'java.lang.Byte',
].forEach(function (t) {
    SERIALIZER_MAP[t] = 'Int';
});

[
    'java.lang.String',
    'String',
    'string',
    'char',
    'char[]',
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
    'Bool': obj => Boolean(obj),
    'Double': obj => Number(obj),
    'Long': obj => patchForHessian(obj),
    'Int': obj => Number(obj),
    'String': obj => String(obj),
    'Date': obj => new Date(obj),
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

const parseObj = function (obj, typeName) {

    let serializerName = SERIALIZER_MAP[typeName]
    if (SERIALIZER[serializerName]) {
        return SERIALIZER[serializerName](obj)
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
    result = obj.map(data => parseObj(data, realTypeName))
    return result
}

const seralizerObj = (fields, typeName) => (obj) => {
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
    if (typeName.indexOf("java.util.Map<") != -1) {
        typeName = "java.util.Map"
    }
    return { $class: typeName, $: result }
}

module.exports = {
    parseObj,
    regist,
}