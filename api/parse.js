const Long = require("long");
const moment = require("moment")

const SERIALIZER_MAP = {};

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
    'String',
    'string',
    'char',
].forEach(function (t) {
    SERIALIZER_MAP[t] = 'string';
});

[
    'java.lang.String',
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

const SERIALIZER = {
    'Bool': obj => Boolean(obj),
    'Double': obj => Number(obj),
    'Long': obj => patchForHessian(obj),
    'Int': obj => obj === null || obj === undefined ? null : Number(obj),
    'int': obj => Number(obj || 0),
    'String': obj => obj && String(obj) || null,
    'string': obj => obj && String(obj) || '',
    'Date': obj => {
        let date = obj && new Date(obj) || null
        if (date) { //toUTC date
            date.setMinutes(date.getTimezoneOffset())
        }
        return date
    },
    'Array': obj => obj && Array.from(obj) || null,
}

const UNSERIALIZER = {
    'Bool': obj => obj,
    'Double': obj => obj,
    'Long': obj => obj,
    'Int': obj => obj,
    'int': obj => obj,
    'String': obj => obj,
    'string': obj => obj,
    'Array': obj => obj,
    'Date': jsonifyDate,
}

function jsonifyDate(obj, pattern) {
    if (!obj) return obj
    if (obj instanceof Date) {
        if (pattern) {
            obj = moment(obj).format(pattern)
        } else if (obj.getHours() == 0 && obj.getMinutes() == 0 && obj.getSeconds() == 0 && obj.getMilliseconds() == 0) {
            obj = moment(obj).format("YYYY-MM-DD")
        } else {
            obj = moment(obj).format('YYYY-MM-DD HH:mm:ss')
        }
    }
    console.log(`${pattern}:${obj}`)
    return obj
}

const toHessian = (obj, typeName) => {

    let serializerName = SERIALIZER_MAP[typeName]
    if (SERIALIZER[serializerName]) {
        return SERIALIZER[serializerName](obj)
    } else {
        return obj
    }

}

const toJS = (obj) => {
    return remove$(obj)
}

const regist = (typeName, fields, instance) => {
    if (SERIALIZER_MAP[typeName]) return;
    let fun = fields
    fields = fields || []
    let realFields = {};
    Object.keys(fields).forEach(key => {
        let fieldType = fields[key]
        if (fieldType.indexOf('`') != -1) {
            jsonTagHandler(realFields, { key, fieldType })
        } else {
            realFields[key] = fields[key]
        }
    })
    if (typeof fun != "function") {
        if (typeName.indexOf("List<") != -1 || typeName.indexOf("[") != -1) {
            fun = jsArray2Hessian(typeName, realFields, instance)
        } else {
            fun = jsObj2Hessian(typeName, realFields, instance)
        }
    }
    let funToJS = instance
    if (typeof funToJS != 'function') {
        if (typeName.indexOf("List<") != -1 || typeName.indexOf("[") != -1) {
            funToJS = hessianArray2JS(typeName, realFields, instance)
        } else {
            funToJS = hessianObj2JS(typeName, realFields, instance)
        }
    }
    SERIALIZER_MAP[typeName] = typeName
    SERIALIZER[typeName] = fun
    UNSERIALIZER[typeName] = funToJS
}


const patchForHessian = (obj) => {
    if (!obj && obj != 0) return obj
    obj = Long.fromValue(obj)
    if (obj.high == 0 && obj.low < 20) {
        obj.length = obj.low.toString().length
    }
    return obj
}

const remove$ = (obj) => {
    if (obj && obj.$ !== undefined && obj.$class) {
        let mapKey = SERIALIZER_MAP[obj.$class]
        if (mapKey && UNSERIALIZER[mapKey]) {
            //console.log('have '+obj.$class) 
            return UNSERIALIZER[mapKey](obj.$)
        } else {
            console.log('not found: ' + obj.$class)
        }
    }
    if (obj && obj.$) return remove$(obj.$)
    if (!obj || typeof obj != "object") return obj
    if (obj instanceof Date) return jsonifyDate(obj)
    Object.keys(obj).forEach(key => obj[key] = remove$(obj[key]))
    return obj
}

const jsonTagHandler = (realFields, { key, fieldType }) => {
    let type = fieldType.split('`')[0]
    let jsonTag = fieldType.substr(type.length)
    jsonTag = jsonTag.split('`').join(';')

    let handler = {
        JsonIgnore: () => {
            //"nullUpdate": "boolean`JsonIgnore('true')",
            realFields[key] = null
        },
        JsonProperty: (alias) => {
            //"newName": "java.lang.String`JsonProperty('name')",
            realFields[key] = { alias, key, type }
            realFields[alias] = { alias, key, type }
        },
        JsonFormat: (pattern) => {
            if (pattern) {
                pattern = pattern.replace('yyyy', 'YYYY')
                pattern = pattern.replace('dd', 'DD')
            }
            realFields[key] = { pattern, key, type }
            console.log(`${key}:${fieldType}:${pattern}`)
        }
    }
    Function('handler', 'with(handler){' + jsonTag + '}')(handler)
}

const hessianArray2JS = (typeName, fields, instance) => (obj) => {
    if (!obj || obj.length == 0) return obj

    return obj.map(toJS)
}

const hessianObj2JS = (typeName, fields, instance) => (obj) => {
    if (!obj) return obj
    let result = {}
    Object.keys(obj).forEach(k => {
        let fieldType = fields[k] || fields["*"]
        if (!fieldType) return;
        let value = obj[k]
        if (value && value.hasOwnProperty && value.hasOwnProperty('$')) {
            value = value.$
        }

        let pattern = null
        if (typeof fieldType == 'object') {
            let meta = fieldType
            if (meta.alias) {
                k = meta.alias
            }
            pattern = meta.pattern
            fieldType = meta.type
        }

        let serializerName = SERIALIZER_MAP[fieldType]
        if (UNSERIALIZER[serializerName]) {
            result[k] = UNSERIALIZER[serializerName](value, pattern)
        } else {
            console.warn("parse.js,hessianObj2JS,未找到类型对应的序列化方法,类型：" + fieldType)
            result[k] = value
        }
    })

    return result
}

const jsArray2Hessian = (typeName, fields, instance) => (obj) => {
    if (!obj) return null;
    let realTypeName = typeName
    if (typeName.indexOf("List<") != -1) {
        realTypeName = typeName.replace(">", "").split("<")[1]
    } else if (typeName.indexOf("[") == 0) {
        realTypeName = typeName.substr(1)
    } else if (typeName == 'byte[]') {
        if (obj instanceof Buffer) {
            return obj
        } else {
            return new Buffer(obj)
        }
    } else if (typeName.indexOf("[") != -1) {
        realTypeName = typeName.split("[")[0]
    }
    if(typeof obj == 'string')obj = obj.split(',') //for formpost download file
    let result = [];
    obj.forEach((data, index) => {
        result.push(toHessian(data, realTypeName))
    })
    return result
}

const jsObj2Hessian = (typeName, fields, instance) => (obj) => {
    if (!obj) return obj;
    let result = {}
    Object.keys(obj).forEach(k => {
        let fieldType = fields[k] || fields["*"]
        if (!fieldType) return;
        let value = obj[k]
        if (typeof fieldType == 'object') {
            let meta = fieldType
            if (k == meta.alias) {
                k = meta.key
            }
            fieldType = fieldType.type
        }
        let serializerName = SERIALIZER_MAP[fieldType]
        if (SERIALIZER[serializerName]) {
            result[k] = SERIALIZER[serializerName](value)
        } else {
            console.warn("parse.js,未找到类型对应的序列化方法,类型：" + fieldType)
            result[k] = toJS(value)
        }
    })

    if (instance) {
        result = Object.assign({}, instance, result)
    }

    if (typeName.indexOf("java.util.Map<") != -1) {
        typeName = "java.util.Map"
    }
    return { $class: typeName, $: result }
}

module.exports = {
    regist,
    toHessian,
    toJS,
}