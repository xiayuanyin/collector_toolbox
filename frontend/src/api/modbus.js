import request from "./request";

export function connectModbus(info) {
    return request({
        url: "/modbus/connect",
        method: "post",
        data: info,
    });
}
export function disconnectModbus(id) {
    return request({
        url: `/modbus/disconnect?id=${id}`,
        method: "post"
    });
}

export function modbusWrite(id, data) {
    return request({
        url: `/modbus/write?id=${id}`,
        method: "post",
        data
    });
}
export function sendModbusCollectAddress(id, addresses) {
    return request({
        url: `/modbus/set_readers?id=${id}`,
        method: "post",
        data: addresses
    });
}