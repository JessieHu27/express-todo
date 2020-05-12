<img src="./node/static/tom.jpg" alt="avator" style="zoom:200%;" />

## 笔记

+ JavaScript原型链
+ ES6+
+ TypeScript
+ React Hooks

***

## 编码

1、uint8Array转string

```
function uint8ArrayToString(fileData){
  var dataString = "";
  for (var i = 0; i < fileData.length; i++) {
    dataString += String.fromCharCode(fileData[i]);
  }
  return dataString
}
var arr = [48,48,48,48]
uint8ArrayToString(arr)  //"0000"
```

2、string装uint8Array 

```
function stringToUint8Array(str){
  var arr = [];
  for (var i = 0, j = str.length; i < j; ++i) {
    arr.push(str.charCodeAt(i));
  }
 
  var tmpUint8Array = new Uint8Array(arr);
  return tmpUint8Array
}
stringToUint8Array('12313132') // Uint8Array(8)   [49, 50, 51, 49, 51, 49, 51, 50]
```

3、 int转byte[]

```
function intTobytes(n) {
  var bytes = [];
  for (var i = 0; i < 2; i++) {
    bytes[i] = n >> (8 - i * 8);
  }
  return bytes;
}
intTobytes(10) // [0, 10]
```

4、string转ArrayBuffer

```
function stringToArrayBuffer(str) {
  var buf = new ArrayBuffer(str.length * 2); // 每个字符占用2个字节
  var bufView = new Uint16Array(buf);
  for (var i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}
stringToArrayBuffer('00000')
输出：ArrayBuffer(10) {}
```

5、arrayBuffer转string

```
function arrayBufferToString(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}
```

6、base64转blob（二进制）

```
function base64toBlob(base64,type) {  
    // 将base64转为Unicode规则编码
    bstr = atob(base64, type),  
    n = bstr.length,  
    u8arr = new Uint8Array(n);  
    while (n--) {  
        u8arr[n] = bstr.charCodeAt(n) // 转换编码后才可以使用charCodeAt 找到Unicode编码
    }  
    return new Blob([u8arr], {  
        type,
    })
} 

输出：Blob {size: 3, type: "png"}
```