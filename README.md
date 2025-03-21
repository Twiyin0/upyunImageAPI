# upyunImageAPI

# 说明
## 安装
### 依赖
需要使用[nodejs](https://nodejs.org)(>=node18)  
作者node版本为`20.14.0`

### 安装步骤
> 你可以选择你喜欢的包管理器，我使用的是yarn
1. git克隆到你的本地
```sh
git clone https://github.com/Twiyin0/upyunImageAPI.git
```
2. 进入目录
```sh
cd upyunImageAPI
```
3. 修改`config.json`
4. 使用`yarn`安装node依赖并且启动服务
```sh
yarn && yarn start
```
当然你也可以使用`npm`
```sh
npm i && npm run start
```

**没写别的包管理器不是我看不起它们，而是我根本没用过，你们喜欢用啥就用啥，不会用的就npm！！**

## config.json
```json
{
    "host": "0.0.0.0",    //启动地址，下面是端口，留空则127.0.0.1
    "port": 3001,           // 启动端口
    "upyunDomain": "https://yourdomain.com", // upyun加速域名
    "serviceName": "img-store", // upyun服务名称
    "operator": "operator",       // upyun存储授权操作员
    "password": "IAmASimplePassword",   // 操作员密码等
    "remotePath": "/img", // 存储服务的访问根路径
    "https": false
}
```
以上配置把加速域名、操作员、服务名称等换成自己的应该是能用的，除非路径下的不是图片而是别的文件

## 访问参数
### type
```
http://yourdomain.com/img?type=[json,webp,base64,org]
```
在访问url后面加?type=，然后选择中括号内的四个任意之一
* json: 以json形式返回，返回格式 { "imgUrl": "upyun的图片url" }  
http://yourdomain.com/img?type=json
* webp: 以webp的形式返回，返回的图片会压缩，但是不影响看  
http://yourdomain.com/img?type=webp
* base64: 返回base64数据，返回格式 { "data": "base64,image/png, xxxxx" }  
http://yourdomain.com/img?type=base64
* org: 返回图片时Url不会重定向到upyun,需要返回webp可以加参数&webp=true
    - http://yourdomain.com/img?type=org
    - http://yourdomain.com/img?type=org&webp=true

# changelog

## v0.1.0 demo
* 一个勉强能用的版本

## v0.0.1-beta.1
发布版本，提交至github
