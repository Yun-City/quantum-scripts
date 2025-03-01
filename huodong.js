const $ = new Env('活动进度');

require('./env.js');
let EnableConc = process.env.EnableConc == "True"; //是否开启并发

const { addEnvs, getEnvs, sendNotify
} = require('./quantum');

let allMessage = '';
let ReturnMessage = '';
let cookiesArr = [], cookie = '';

let intPerSent = 1;
if (process.env.BEANCHANGE_PERSENT) {
    intPerSent = parseInt(process.env.BEANCHANGE_PERSENT);
    console.log(`检测到设定了分段通知:` + intPerSent);
}


let cookiesArr = []
if (process.env.JD_COOKIE) {
    cookiesArr = process.env.JD_COOKIE.split("&");
}

const JD_API_HOST = 'https://api.m.jd.com/client.action';
!(async () => {
    if (!cookiesArr[0] && !EnableConc) {
        console.log("好像没有提交狗东CK？");
        await sendNotify('好像没有提交狗东CK？')
        return;
    }
    for (let i = 0; i < cookiesArr.length; i++) {
        if (cookiesArr[i]) {
            cookie = cookiesArr[i];
            $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
            $.CryptoJS = $.isNode() ? require('crypto-js') : CryptoJS;
            $.index = i + 1;
            $.beanCount = 0;
            $.incomeBean = 0;
            $.expenseBean = 0;
            $.todayIncomeBean = 0;
            $.errorMsg = '';
            $.isLogin = true;
            $.nickName = '';
            $.message = '';
            $.balance = 0;
            $.expiredBalance = 0;
            $.JdzzNum = 0;
            $.JdMsScore = 0;
            $.JdFarmProdName = '';
            $.JdtreeEnergy = 0;
            $.JdtreeTotalEnergy = 0;
            $.JdwaterTotalT = 0;
            $.JdwaterD = 0;
            $.JDwaterEveryDayT = 0;
            $.JDtotalcash = 0;
            $.JDEggcnt = 0;
            $.Jxmctoken = '';
            console.log(`\n********开始【京东账号${$.index}】${$.nickName || $.UserName}******\n`);
            await getJdZZ();
            await getMs();
            await jdfruitRequest('taskInitForFarm', { "version": 14, "channel": 1, "babelChannel": "120" });
            await getjdfruit();
            await cash();
            await requestAlgo();
            await JxmcGetRequest();
            await getJxFactory();   //惊喜工厂
            await showMsg();
            if (intPerSent > 0) {
                if ((i + 1) % intPerSent == 0) {
                    console.log("分段通知条件达成，处理发送通知....");
                    if ($.isNode() && allMessage) {
                        notify.sendNotify(allMessage)
                    }
                    allMessage = "";
                }
            }
        }
    }
    if ($.isNode() && allMessage) {
        notify.sendNotify(allMessage)
    }
})()
    .catch((e) => {
        $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
    })
    .finally(() => {
        $.done();
    })
async function showMsg() {
    if ($.errorMsg) ReturnMessage
    ReturnMessage = `京东账号：${$.nickName || $.UserName}\n`;

    if (typeof $.JDEggcnt !== "undefined") {
        ReturnMessage += `京喜牧场：${$.JDEggcnt}枚鸡蛋\n`;
    }
    if (typeof $.JDtotalcash !== "undefined") {
        ReturnMessage += `极速金币：${$.JDtotalcash}金币(≈${$.JDtotalcash / 10000}元)\n`;
    }
    if (typeof $.JdzzNum !== "undefined") {
        ReturnMessage += `京东赚赚：${$.JdzzNum}金币(≈${$.JdzzNum / 10000}元)\n`;
    }
    if ($.JdMsScore != 0) {
        ReturnMessage += `京东秒杀：${$.JdMsScore}秒秒币(≈${$.JdMsScore / 1000}元)\n`;
    }
    if ($.JdFarmProdName != "") {
        if ($.JdtreeEnergy != 0) {
            ReturnMessage += `东东农场：${$.JdFarmProdName},进度${(($.JdtreeEnergy / $.JdtreeTotalEnergy) * 100).toFixed(2)}%`;
            if ($.JdwaterD != 'Infinity' && $.JdwaterD != '-Infinity') {
                ReturnMessage += `,${$.JdwaterD === 1 ? '明天' : $.JdwaterD === 2 ? '后天' : $.JdwaterD + '天后'}可兑🍉\n`;
            } else {
                ReturnMessage += `\n`;
            }
        } else {
            ReturnMessage += `东东农场：${$.JdFarmProdName}\n`;
        }
    }
    const response = await await PetRequest('energyCollect');
    const initPetTownRes = await PetRequest('initPetTown');
    if (initPetTownRes.code === '0' && initPetTownRes.resultCode === '0' && initPetTownRes.message === 'success') {
        $.petInfo = initPetTownRes.result;
        if (response.resultCode === '0') {
            ReturnMessage += `东东萌宠：${$.petInfo.goodsInfo.goodsName},`;
            ReturnMessage += `勋章${response.result.medalNum}/${response.result.medalNum + response.result.needCollectMedalNum}块(${response.result.medalPercent}%)\n`;
        }
    }
    ReturnMessage += `${$.message}`;
    allMessage += ReturnMessage;
    $.msg($.name, '', ReturnMessage, { "open-url": "https://bean.m.jd.com/beanDetail/index.action?resourceValue=bean" });
}

function getJdZZ() {
    return new Promise(resolve => {
        $.get(taskJDZZUrl("interactTaskIndex"), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    if (safeGet(data)) {
                        data = JSON.parse(data);
                        $.JdzzNum = data.data.totalNum
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}

function taskJDZZUrl(functionId, body = {}) {
    return {
        url: `${JD_API_HOST}?functionId=${functionId}&body=${escape(JSON.stringify(body))}&client=wh5&clientVersion=9.1.0`,
        headers: {
            'Cookie': cookie,
            'Host': 'api.m.jd.com',
            'Connection': 'keep-alive',
            'Content-Type': 'application/json',
            'Referer': 'http://wq.jd.com/wxapp/pages/hd-interaction/index/index',
            'User-Agent': $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
            'Accept-Language': 'zh-cn',
            'Accept-Encoding': 'gzip, deflate, br',
        }
    }
}

function getMs() {
    return new Promise(resolve => {
        $.post(taskMsPostUrl('homePageV2', {}, 'appid=SecKill2020'), (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${err},${jsonParse(resp.body)['message']}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    if (safeGet(data)) {
                        data = JSON.parse(data)
                        if (data.code === 2041) {
                            $.JdMsScore = data.result.assignment.assignmentPoints || 0
                        }
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}

function taskMsPostUrl(function_id, body = {}, extra = '', function_id2) {
    let url = `${JD_API_HOST}`;
    if (function_id2) {
        url += `?functionId=${function_id2}`;
    }
    return {
        url,
        body: `functionId=${function_id}&body=${escape(JSON.stringify(body))}&client=wh5&clientVersion=1.0.0&${extra}`,
        headers: {
            "Cookie": cookie,
            "origin": "https://h5.m.jd.com",
            "referer": "https://h5.m.jd.com/babelDiy/Zeus/2NUvze9e1uWf4amBhe1AV6ynmSuH/index.html",
            'Content-Type': 'application/x-www-form-urlencoded',
            "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
        }
    }
}

async function getjdfruit() {
    return new Promise(resolve => {
        const option = {
            url: `${JD_API_HOST}?functionId=initForFarm`,
            body: `body=${escape(JSON.stringify({ "version": 4 }))}&appid=wh5&clientVersion=9.1.0`,
            headers: {
                "accept": "*/*",
                "accept-encoding": "gzip, deflate, br",
                "accept-language": "zh-CN,zh;q=0.9",
                "cache-control": "no-cache",
                "cookie": cookie,
                "origin": "https://home.m.jd.com",
                "pragma": "no-cache",
                "referer": "https://home.m.jd.com/myJd/newhome.action",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-site",
                "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
                "Content-Type": "application/x-www-form-urlencoded"
            },
            timeout: 10000,
        };
        $.post(option, (err, resp, data) => {
            try {
                if (err) {
                    console.log('\n东东农场: API查询请求失败 ‼️‼️');
                    console.log(JSON.stringify(err));
                    $.logErr(err);
                } else {
                    if (safeGet(data)) {
                        $.farmInfo = JSON.parse(data)
                        if ($.farmInfo.farmUserPro) {
                            $.JdFarmProdName = $.farmInfo.farmUserPro.name;
                            $.JdtreeEnergy = $.farmInfo.farmUserPro.treeEnergy;
                            $.JdtreeTotalEnergy = $.farmInfo.farmUserPro.treeTotalEnergy;

                            let waterEveryDayT = $.JDwaterEveryDayT;
                            let waterTotalT = ($.farmInfo.farmUserPro.treeTotalEnergy - $.farmInfo.farmUserPro.treeEnergy - $.farmInfo.farmUserPro.totalEnergy) / 10;//一共还需浇多少次水
                            let waterD = Math.ceil(waterTotalT / waterEveryDayT);

                            $.JdwaterTotalT = waterTotalT;
                            $.JdwaterD = waterD;
                        }
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve();
            }
        })
    })
}

function jdfruitRequest(function_id, body = {}, timeout = 1000) {
    return new Promise(resolve => {
        setTimeout(() => {
            $.get(taskfruitUrl(function_id, body), (err, resp, data) => {
                try {
                    if (err) {
                        console.log('\n东东农场: API查询请求失败 ‼️‼️')
                        console.log(JSON.stringify(err));
                        console.log(`function_id:${function_id}`)
                        $.logErr(err);
                    } else {
                        if (safeGet(data)) {
                            data = JSON.parse(data);
                            $.JDwaterEveryDayT = data.totalWaterTaskInit.totalWaterTaskTimes;
                        }
                    }
                } catch (e) {
                    $.logErr(e, resp);
                } finally {
                    resolve(data);
                }
            })
        }, timeout)
    })
}

async function PetRequest(function_id, body = {}) {
    return new Promise((resolve, reject) => {
        $.post(taskPetUrl(function_id, body), (err, resp, data) => {
            try {
                if (err) {
                    console.log('\n东东萌宠: API查询请求失败 ‼️‼️');
                    console.log(JSON.stringify(err));
                    $.logErr(err);
                } else {
                    data = JSON.parse(data);
                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve(data)
            }
        })
    })
}

function taskPetUrl(function_id, body = {}) {
    body["version"] = 2;
    body["channel"] = 'app';
    return {
        url: `${JD_API_HOST}?functionId=${function_id}`,
        body: `body=${escape(JSON.stringify(body))}&appid=wh5&loginWQBiz=pet-town&clientVersion=9.0.4`,
        headers: {
            'Cookie': cookie,
            'User-Agent': $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
            'Host': 'api.m.jd.com',
            'Content-Type': 'application/x-www-form-urlencoded',
        }
    };
}

function taskfruitUrl(function_id, body = {}) {
    return {
        url: `${JD_API_HOST}?functionId=${function_id}&appid=wh5&body=${escape(JSON.stringify(body))}`,
        headers: {
            Cookie: cookie,
            UserAgent: $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
        },
        timeout: 10000,
    }
}

function safeGet(data) {
    try {
        if (typeof JSON.parse(data) == "object") {
            return true;
        }
    } catch (e) {
        console.log(e);
        console.log(`京东服务器访问数据为空，请检查自身设备网络情况`);
        return false;
    }
}

function cash() {
    return new Promise(resolve => {
        $.get(taskcashUrl('MyAssetsService.execute',
            { "method": "userCashRecord", "data": { "channel": 1, "pageNum": 1, "pageSize": 20 } }),
            async (err, resp, data) => {
                try {
                    if (err) {
                        console.log(`${JSON.stringify(err)}`)
                        console.log(`${$.name} API请求失败，请检查网路重试`)
                    } else {
                        if (safeGet(data)) {
                            data = JSON.parse(data);
                            $.JDtotalcash = data.data.goldBalance;
                        }
                    }
                } catch (e) {
                    $.logErr(e, resp)
                } finally {
                    resolve(data);
                }
            })
    })
}

var __Oxb24bc = ["lite-android&", "stringify", "&android&3.1.0&", "&", "&846c4c32dae910ef", "12aea658f76e453faf803d15c40a72e0", "isNode", "crypto-js", "", "api?functionId=", "&body=", "&appid=lite-android&client=android&uuid=846c4c32dae910ef&clientVersion=3.1.0&t=", "&sign=", "api.m.jd.com", "*/*", "RN", "JDMobileLite/3.1.0 (iPad; iOS 14.4; Scale/2.00)", "zh-Hans-CN;q=1, ja-CN;q=0.9", "undefined", "log", "", "", "", "", "jsjia", "mi.com"];

function taskcashUrl(_0x7683x2, _0x7683x3 = {}) {
    let _0x7683x4 = +new Date();
    let _0x7683x5 = `${__Oxb24bc[0x0]}${JSON[__Oxb24bc[0x1]](_0x7683x3)}${__Oxb24bc[0x2]}${_0x7683x2}${__Oxb24bc[0x3]}${_0x7683x4}${__Oxb24bc[0x4]}`;
    let _0x7683x6 = __Oxb24bc[0x5];
    const _0x7683x7 = $[__Oxb24bc[0x6]]() ? require(__Oxb24bc[0x7]) : CryptoJS;
    let _0x7683x8 = _0x7683x7.HmacSHA256(_0x7683x5, _0x7683x6).toString();
    return {
        url: `${__Oxb24bc[0x8]}${JD_API_HOST}${__Oxb24bc[0x9]}${_0x7683x2}${__Oxb24bc[0xa]}${escape(JSON[__Oxb24bc[0x1]](_0x7683x3))}${__Oxb24bc[0xb]}${_0x7683x4}${__Oxb24bc[0xc]}${_0x7683x8}${__Oxb24bc[0x8]}`,
        headers: {
            'Host': __Oxb24bc[0xd],
            'accept': __Oxb24bc[0xe],
            'kernelplatform': __Oxb24bc[0xf],
            'user-agent': __Oxb24bc[0x10],
            'accept-language': __Oxb24bc[0x11],
            'Cookie': cookie
        }
    }
} (function (_0x7683x9, _0x7683xa, _0x7683xb, _0x7683xc, _0x7683xd, _0x7683xe) {
    _0x7683xe = __Oxb24bc[0x12];
    _0x7683xc = function (_0x7683xf) {
        if (typeof alert !== _0x7683xe) {
            alert(_0x7683xf)
        };
        if (typeof console !== _0x7683xe) {
            console[__Oxb24bc[0x13]](_0x7683xf)
        }
    };
    _0x7683xb = function (_0x7683x7, _0x7683x9) {
        return _0x7683x7 + _0x7683x9
    };
    _0x7683xd = _0x7683xb(__Oxb24bc[0x14], _0x7683xb(_0x7683xb(__Oxb24bc[0x15], __Oxb24bc[0x16]), __Oxb24bc[0x17]));
    try {
        _0x7683x9 = __encode;
        if (!(typeof _0x7683x9 !== _0x7683xe && _0x7683x9 === _0x7683xb(__Oxb24bc[0x18], __Oxb24bc[0x19]))) {
            _0x7683xc(_0x7683xd)
        }
    } catch (e) {
        _0x7683xc(_0x7683xd)
    }
})({})

async function JxmcGetRequest() {
    let url = ``;
    let myRequest = ``;
    url = `https://m.jingxi.com/jxmc/queryservice/GetHomePageInfo?channel=7&sceneid=1001&activeid=null&activekey=null&isgift=1&isquerypicksite=1&_stk=channel%2Csceneid&_ste=1`;
    url += `&h5st=${decrypt(Date.now(), '', '', url)}&_=${Date.now() + 2}&sceneval=2&g_login_type=1&callback=jsonpCBK${String.fromCharCode(Math.floor(Math.random() * 26) + "A".charCodeAt(0))}&g_ty=ls`;
    myRequest = getGetRequest(`GetHomePageInfo`, url);


    return new Promise(async resolve => {
        $.get(myRequest, (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`API请求失败，请检查网路重试`)
                    $.runFlag = false;
                    console.log(`请求失败`)
                } else {
                    data = JSON.parse(data.match(new RegExp(/jsonpCBK.?\((.*);*/))[1]);
                    if (data.ret === 0) {
                        $.JDEggcnt = data.data.eggcnt;
                    }
                }
            } catch (e) {
                console.log(data);
                $.logErr(e, resp)
            } finally {
                resolve();
            }
        })
    })
}
// 惊喜工厂信息查询
function getJxFactory() {
    return new Promise(async resolve => {
        let infoMsg = "";
        await $.get(jxTaskurl('userinfo/GetUserInfo', `pin=&sharePin=&shareType=&materialTuanPin=&materialTuanId=&source=`, '_time,materialTuanId,materialTuanPin,pin,sharePin,shareType,source,zone'), async (err, resp, data) => {
            try {
                if (err) {
                    $.jxFactoryInfo = "查询失败!";
                } else {
                    if (safeGet(data)) {
                        data = JSON.parse(data);
                        if (data['ret'] === 0) {
                            data = data['data'];
                            $.unActive = true;//标记是否开启了京喜活动或者选购了商品进行生产
                            if (data.factoryList && data.productionList) {
                                const production = data.productionList[0];
                                $.commodityDimId = production.commodityDimId;
                                await GetCommodityDetails();//获取已选购的商品信息
                                infoMsg = `${$.jxProductName} ,进度:${((production.investedElectric / production.needElectric) * 100).toFixed(2)}%`;
                                if (production.investedElectric >= production.needElectric) {
                                    if (production['exchangeStatus'] === 1) {
                                        infoMsg = `${$.jxProductName} ,已经可兑换，请手动兑换`;
                                    }
                                    if (production['exchangeStatus'] === 3) {
                                        if (new Date().getHours() === 9) {
                                            infoMsg = `${$.jxProductName} ,兑换已超时，请选择新商品进行制造`;
                                        }
                                    }
                                } else {
                                    infoMsg += ` ,预计:${((production.needElectric - production.investedElectric) / (2 * 60 * 60 * 24)).toFixed(2)}天可兑换`
                                }
                                if (production.status === 3) {
                                    infoMsg = `${$.jxProductName} ,已经超时失效, 请选择新商品进行制造`
                                }
                            } else {
                                $.unActive = false;//标记是否开启了京喜活动或者选购了商品进行生产
                                if (!data.factoryList) {
                                    infoMsg = "当前未开始生产商品,请手动去京东APP->游戏与互动->查看更多->京喜工厂 开启活动"
                                    // $.msg($.name, '【提示】', `京东账号${$.index}[${$.nickName}]京喜工厂活动未开始\n请手动去京东APP->游戏与互动->查看更多->京喜工厂 开启活动`);
                                } else if (data.factoryList && !data.productionList) {
                                    infoMsg = "当前未开始生产商品,请手动去京东APP->游戏与互动->查看更多->京喜工厂 开启活动"
                                }
                            }
                        }
                    } else {
                        console.log(`GetUserInfo异常：${JSON.stringify(data)}`)
                    }
                }
                $.jxFactoryInfo = infoMsg;
                // console.log(infoMsg);
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve();
            }
        })
    }
    )
}

// 惊喜的Taskurl
function jxTaskurl(functionId, body = '', stk) {
    let url = `https://m.jingxi.com/dreamfactory/${functionId}?zone=dream_factory&${body}&sceneval=2&g_login_type=1&_time=${Date.now()}&_=${Date.now() + 2}&_ste=1`
    url += `&h5st=${decrypt(Date.now(), stk, '', url)}`
    if (stk) {
        url += `&_stk=${encodeURIComponent(stk)}`;
    }
    return {
        url,
        headers: {
            'Cookie': cookie,
            'Host': 'm.jingxi.com',
            'Accept': '*/*',
            'Connection': 'keep-alive',
            'User-Agent': functionId === 'AssistFriend' ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.66 Safari/537.36" : 'jdpingou',
            'Accept-Language': 'zh-cn',
            'Referer': 'https://wqsd.jd.com/pingou/dream_factory/index.html',
            'Accept-Encoding': 'gzip, deflate, br',
        }
    }
}

//惊喜查询当前生产的商品名称
function GetCommodityDetails() {
    return new Promise(async resolve => {
        // const url = `/dreamfactory/diminfo/GetCommodityDetails?zone=dream_factory&sceneval=2&g_login_type=1&commodityId=${$.commodityDimId}`;
        $.get(jxTaskurl('diminfo/GetCommodityDetails', `commodityId=${$.commodityDimId}`, `_time,commodityId,zone`), (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    if (safeGet(data)) {
                        data = JSON.parse(data);
                        if (data['ret'] === 0) {
                            data = data['data'];
                            $.jxProductName = data['commodityList'][0].name;
                        } else {
                            console.log(`GetCommodityDetails异常：${JSON.stringify(data)}`)
                        }
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve();
            }
        })
    })
}

function randomString(e) {
    e = e || 32;
    let t = "0123456789abcdef", a = t.length, n = "";
    for (let i = 0; i < e; i++)
        n += t.charAt(Math.floor(Math.random() * a));
    return n
}

function getGetRequest(type, url) {
    UA = `jdpingou;iPhone;4.13.0;14.4.2;${randomString(40)};network/wifi;model/iPhone10,2;appBuild/100609;ADID/00000000-0000-0000-0000-000000000000;supportApplePay/1;hasUPPay/0;pushNoticeIsOpen/1;hasOCPay/0;supportBestPay/0;session/${Math.random * 98 + 1};pap/JA2019_3111789;brand/apple;supportJDSHWK/1;Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148`

    const method = `GET`;
    let headers = {
        'Origin': `https://st.jingxi.com`,
        'Cookie': cookie,
        'Connection': `keep-alive`,
        'Accept': `application/json`,
        'Referer': `https://st.jingxi.com/pingou/jxmc/index.html`,
        'Host': `m.jingxi.com`,
        'User-Agent': UA,
        'Accept-Encoding': `gzip, deflate, br`,
        'Accept-Language': `zh-cn`
    };
    return { url: url, method: method, headers: headers };
}


Date.prototype.Format = function (fmt) {
    var e,
        n = this, d = fmt, l = {
            "M+": n.getMonth() + 1,
            "d+": n.getDate(),
            "D+": n.getDate(),
            "h+": n.getHours(),
            "H+": n.getHours(),
            "m+": n.getMinutes(),
            "s+": n.getSeconds(),
            "w+": n.getDay(),
            "q+": Math.floor((n.getMonth() + 3) / 3),
            "S+": n.getMilliseconds()
        };
    /(y+)/i.test(d) && (d = d.replace(RegExp.$1, "".concat(n.getFullYear()).substr(4 - RegExp.$1.length)));
    for (var k in l) {
        if (new RegExp("(".concat(k, ")")).test(d)) {
            var t, a = "S+" === k ? "000" : "00";
            d = d.replace(RegExp.$1, 1 == RegExp.$1.length ? l[k] : ("".concat(a) + l[k]).substr("".concat(l[k]).length))
        }
    }
    return d;
}

function decrypt(time, stk, type, url) {
    stk = stk || (url ? getJxmcUrlData(url, '_stk') : '')
    if (stk) {
        const timestamp = new Date(time).Format("yyyyMMddhhmmssSSS");
        let hash1 = '';
        if ($.fingerprint && $.Jxmctoken && $.enCryptMethodJD) {
            hash1 = $.enCryptMethodJD($.Jxmctoken, $.fingerprint.toString(), timestamp.toString(), $.appId.toString(), $.CryptoJS).toString($.CryptoJS.enc.Hex);
        } else {
            const random = '5gkjB6SpmC9s';
            $.Jxmctoken = `tk01wcdf61cb3a8nYUtHcmhSUFFCfddDPRvKvYaMjHkxo6Aj7dhzO+GXGFa9nPXfcgT+mULoF1b1YIS1ghvSlbwhE0Xc`;
            $.fingerprint = 5287160221454703;
            const str = `${$.Jxmctoken}${$.fingerprint}${timestamp}${$.appId}${random}`;
            hash1 = $.CryptoJS.SHA512(str, $.Jxmctoken).toString($.CryptoJS.enc.Hex);
        }
        let st = '';
        stk.split(',').map((item, index) => {
            st += `${item}:${getJxmcUrlData(url, item)}${index === stk.split(',').length - 1 ? '' : '&'}`;
        })
        const hash2 = $.CryptoJS.HmacSHA256(st, hash1.toString()).toString($.CryptoJS.enc.Hex);
        return encodeURIComponent(["".concat(timestamp.toString()), "".concat($.fingerprint.toString()), "".concat($.appId.toString()), "".concat($.Jxmctoken), "".concat(hash2)].join(";"))
    } else {
        return '20210318144213808;8277529360925161;10001;tk01w952a1b73a8nU0luMGtBanZTHCgj0KFVwDa4n5pJ95T/5bxO/m54p4MtgVEwKNev1u/BUjrpWAUMZPW0Kz2RWP8v;86054c036fe3bf0991bd9a9da1a8d44dd130c6508602215e50bb1e385326779d'
    }
}

async function requestAlgo() {
    $.fingerprint = await generateFp();
    $.appId = 10028;
    const options = {
        "url": `https://cactus.jd.com/request_algo?g_ty=ajax`,
        "headers": {
            'Authority': 'cactus.jd.com',
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache',
            'Accept': 'application/json',
            'User-Agent': $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
            //'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
            'Content-Type': 'application/json',
            'Origin': 'https://st.jingxi.com',
            'Sec-Fetch-Site': 'cross-site',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Dest': 'empty',
            'Referer': 'https://st.jingxi.com/',
            'Accept-Language': 'zh-CN,zh;q=0.9,zh-TW;q=0.8,en;q=0.7'
        },
        'body': JSON.stringify({
            "version": "1.0",
            "fp": $.fingerprint,
            "appId": $.appId.toString(),
            "timestamp": Date.now(),
            "platform": "web",
            "expandParams": ""
        })
    }
    new Promise(async resolve => {
        $.post(options, (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`request_algo 签名参数API请求失败，请检查网路重试`)
                } else {
                    if (data) {
                        data = JSON.parse(data);
                        if (data['status'] === 200) {
                            $.Jxmctoken = data.data.result.tk;
                            let enCryptMethodJDString = data.data.result.algo;
                            if (enCryptMethodJDString) $.enCryptMethodJD = new Function(`return ${enCryptMethodJDString}`)();
                        } else {
                            console.log('request_algo 签名参数API请求失败:')
                        }
                    } else {
                        console.log(`京东服务器返回空数据`)
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve();
            }
        })
    })
}

function generateFp() {
    let e = "0123456789";
    let a = 13;
    let i = '';
    for (; a--;)
        i += e[Math.random() * e.length | 0];
    return (i + Date.now()).slice(0, 16)
}

function getJxmcUrlData(url, name) {
    if (typeof URL !== "undefined") {
        let urls = new URL(url);
        let data = urls.searchParams.get(name);
        return data ? data : '';
    } else {
        const query = url.match(/\?.*/)[0].substring(1)
        const vars = query.split('&')
        for (let i = 0; i < vars.length; i++) {
            const pair = vars[i].split('=')
            if (pair[0] === name) {
                return vars[i].substr(vars[i].indexOf('=') + 1);
            }
        }
        return ''
    }
}

function jsonParse(str) {
    if (typeof str == "string") {
        try {
            return JSON.parse(str);
        } catch (e) {
            console.log(e);
            $.msg($.name, '', '请勿随意在BoxJs输入框修改内容\n建议通过脚本去获取cookie')
            return [];
        }
    }
}

// prettier-ignore
function Env(t, e) { class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), n = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(n, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }
