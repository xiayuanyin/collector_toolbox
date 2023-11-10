const typeFunctionMapping = {
    int:        {read: 'getInt16', write: 'setInt16', bytes: 2},
    int16:      {read: 'getInt16', write: 'setInt16', bytes: 2},
    uint:       {read: 'getUint16', write: 'setUint16', bytes: 2},
    dint:       {read: 'getInt32', write: 'setInt32', bytes: 4},
    int32:      {read: 'getInt32', write: 'setInt32', bytes: 4},
    bigint:     {read: 'getBigInt64', write: 'setBigInt64', bytes: 8},
    udint:      {read: 'getUint32', write: 'setUint32', bytes: 4},
    uint32:     {read: 'getUint32', write: 'setUint32', bytes: 4},
    dword:      {read: 'getUint32', write: 'setUint32', bytes: 4},
    word:       {read: 'getUint16', write: 'setUint16', bytes: 2},
    uint16:       {read: 'getUint16', write: 'setUint16', bytes: 2},
    byte:       {read: 'getUint8', write: 'setUint8', bytes: 1},
    real:       {read: 'getFloat32', write: 'setFloat32', bytes: 4},
    float:       {read: 'getFloat32', write: 'setFloat32', bytes: 4},
    float32:    {read: 'getFloat32', write: 'setFloat32', bytes: 4},
    dreal:      {read: 'getFloat64', write: 'setFloat64', bytes: 8},
    float64:    {read: 'getFloat64', write: 'setFloat64', bytes: 8},
    string:     {read: 'String', write: 'String', bytes: 1},
}
function getTypeMapping(name){
    return typeFunctionMapping[name.toLowerCase()]
}
function swap16(int16ArrayBuffer){
    for (let i = 0; i < int16ArrayBuffer.length / 2; i++) {
        let t = int16ArrayBuffer[i * 2]
        int16ArrayBuffer[i * 2] = int16ArrayBuffer[i * 2 + 1]
        int16ArrayBuffer[i * 2 + 1] = t
    }
}
const parseBufferTo = (type, arr, LE)=> {
    if(type==="String"){
        let a = new Uint8Array(new Uint16Array(arr).buffer)
        if(!LE) swap16(a)
        return String.fromCharCode(...Array.from(a))
    }

    let words = Math.ceil(getTypeMapping(type).bytes/2)
    let arr2 = arr.slice(0, words)
    if(LE){
        arr2 = arr2.reverse()
    }
    let a = new Uint8Array(new Uint16Array(arr2).buffer)
    if(!LE) swap16(a)
    return new DataView(a.buffer)[getTypeMapping(type).read]()
}
export const castValueToWord = (valueType, value, LE)=>{
    if(valueType==='String'){
        let arr = new TextEncoder().encode(value);
        if(arr.byteLength%2===1) arr = new Uint8Array([...arr, 0])
        if(!LE) swap16(arr)
        return Array.from(new Uint16Array(arr.buffer))
    }

    let t = getTypeMapping(valueType)
    let buffer = new ArrayBuffer(t.bytes)
    let dv = new DataView(buffer)
    dv[t.write](0, value, !LE)
    return Array.from(new Uint16Array(dv.buffer)).reverse()
}
export const castWordArrayTo = (targetType, wordArray, LE = false)=>{
    try{
        if(targetType==='String'){
            let arr = new Uint8Array(Uint16Array.from(wordArray).buffer)
            if(!LE) swap16(arr)
            return new TextDecoder().decode(arr)
        }else{
            return parseBufferTo(targetType, new Uint16Array(wordArray), LE)
        }
    }catch (e){
        return 'N/A'
    }

}
// to test in nodejs env
// for(let i=0;i<100;i++){
//     let v1 = Math.round(Math.random()*65535)
//     let v2 = Math.round(Math.random()*65535)
//     let v3 = Math.round(Math.random()*65535)
//     let v4 = Math.round(Math.random()*65535)
//     let wordArray = [v1, v2, v3, v4]
//     let buffer = Buffer.alloc(8)
//     buffer.writeUint16BE(v1, 0)
//     buffer.writeUint16BE(v2, 2)
//     buffer.writeUint16BE(v3, 4)
//     buffer.writeUint16BE(v4, 6)
//     // case1 INT
//     for(let x=0;x<0;x++){
//         let nodeInt =  buffer.readInt16BE(x*2)
//         let jsInt = castWordArrayTo('Int', [wordArray[x]])
//         if(nodeInt!==jsInt){
//             console.log("Int not match", nodeInt, jsInt, buffer, wordArray)
//         }
//         let nodeIntLE = buffer.readInt16LE(x*2)
//         let jsIntLE = castWordArrayTo('Int', [wordArray[x]], true)
//         if(nodeIntLE!==jsIntLE){
//             console.log("Int not match", nodeIntLE, jsIntLE, buffer, wordArray)
//         }
//         // console.log({nodeInt, jsInt, nodeIntLE, jsIntLE})
//     }
//     // case2 DINT
//     for(let x=0;x<2;x++){
//         let currentWordArray = wordArray.slice(x*2, x*2+2)
//         let nodeInt =  buffer.readInt32BE(x*4)
//         let jsInt = castWordArrayTo('DInt', currentWordArray)
//         if(nodeInt!==jsInt){
//             console.log("DIntBE not match", nodeInt, jsInt, buffer, currentWordArray)
//         }
//         let nodeIntLE = buffer.readInt32LE(x*4)
//         let jsIntLE = castWordArrayTo('DInt', currentWordArray, true)
//         if(nodeIntLE!==jsIntLE){
//             console.log("DIntLE not match", nodeIntLE, jsIntLE, buffer, currentWordArray)
//         }
//         // console.log({nodeInt, jsInt, nodeIntLE, jsIntLE})
//
//         let nodeRealBE = buffer.readFloatBE(x*4)
//         let jsRealBE = castWordArrayTo('Real', currentWordArray)
//         if(!isNaN(nodeRealBE) && nodeRealBE!==jsRealBE){
//             console.log("RealBE not match", nodeRealBE, jsRealBE,buffer, currentWordArray)
//         }
//
//         let nodeRealLE = buffer.readFloatLE(x*4)
//         let jsRealLE = castWordArrayTo('Real', currentWordArray, true)
//         if(nodeRealLE!==jsRealLE){
//             console.log("RealLE not match", nodeRealLE, jsRealLE,buffer, currentWordArray)
//         }
//     }
//
//     let nodeDrealBE = buffer.readDoubleBE()
//     let jsDrealBE = castWordArrayTo('DReal', wordArray)
//     if(nodeDrealBE!==jsDrealBE){
//         console.log("RealBE not match", nodeDrealBE, jsDrealBE,buffer, wordArray)
//     }
//
//     let nodeDrealLE = buffer.readDoubleLE()
//     let jsDrealLE = castWordArrayTo('DReal', wordArray, true)
//     if(nodeDrealLE!==jsDrealLE){
//         console.log("DRealLE not match", nodeDrealLE, jsDrealLE,buffer, wordArray)
//     }
// }
// function equal(words, buffer){
//     for(let i=0;i<words.length;i++){
//         let b = buffer.readUInt16BE(i*2)
//         if(words[i]!==b) return false
//     }
//     return true
// }
// for(let i=0;i<100;i++){
//     //     int
//     let int1 = Math.trunc(Math.random()*32767) * (Math.random()>0.5?1:-1)
//     let buffer1 = Buffer.alloc(2)
//     buffer1.writeInt16BE(int1)
//     if(parseValueToWord('Int', int1)[0] !== buffer1.readUint16BE()) console.log(`int1 BE: ${int1}`)
//     buffer1.writeInt16LE(int1)
//     if(parseValueToWord('Int', int1 , true)[0] !== buffer1.readUint16BE()) console.log(`int1 LE: ${int1}`)
//
//     // dint
//     let dint =  Math.trunc(Math.random()*32767*32767) * (Math.random()>0.5?1:-1)
//     let buffer2 = Buffer.alloc(4)
//     buffer2.writeInt32BE(dint)
//     if(!equal(parseValueToWord('DInt', dint), buffer2)){
//         console.log("dintBE not match", dint, parseValueToWord('DInt', dint), buffer2)
//     }
//     buffer2.writeInt32LE(dint)
//     if(!equal(parseValueToWord('DInt', dint, true), buffer2)){
//         console.log("dint LE not match", dint, parseValueToWord('DInt', dint), buffer2)
//     }
//     // real
//     let real = Math.random()*1e10
//     let buffer3 = Buffer.alloc(4)
//     buffer3.writeFloatBE(real)
//     if(!equal(parseValueToWord('Real', real), buffer3)){
//         console.log("real BE not match", real, parseValueToWord('Real', real), buffer3)
//     }
//
//     buffer3.writeFloatLE(real)
//     if(!equal(parseValueToWord('Real', real, true), buffer3)){
//         console.log("real LE not match", real, parseValueToWord('Real', real), buffer3)
//     }
//     // dreal
//     buffer3 = Buffer.alloc(8)
//     buffer3.writeDoubleBE(real)
//     if(!equal(parseValueToWord('DReal', real), buffer3)){
//         console.log("Dreal BE not match", real, parseValueToWord('DReal', real), buffer3)
//     }
//
//     buffer3.writeDoubleLE(real)
//     if(!equal(parseValueToWord('DReal', real, true), buffer3)){
//         console.log("Dreal LE not match", real, parseValueToWord('DReal', real), buffer3)
//     }
//
// }