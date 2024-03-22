import "dotenv/config"

import type { TREADMEMirrorSitesMatrix, ISource } from "../types"

import * as OpenCC from "opencc-js";

import path from "path"

export const config_path = path.resolve("config")

export const config_custom_path = path.join(config_path, "custom")

export const dist_path = path.resolve("dist")

export const TMPL_DIR = process.env.TMPL_DIR || 'src/tmpl'

export const txt_path = path.join(dist_path, "txt")

export const epg_path = path.join(dist_path, "epg")

export const list_path = path.join(dist_path, "list")

export const sources_path = path.join(dist_path, "sources")

export const tvbox_path = path.join(dist_path, "tvbox")

export const write_custom_path = path.join(dist_path, "custom")

export const README_DIR = path.join(".readme")

export const PUBLIC_DIR = process.env.PUBLIC_DIR || './.gh-pages'

export const OWNER = 'vodtv'

export const REPO = 'm3u'

export const converter = OpenCC.Converter({ from: "hk", to: "cn" });
export const RAW_URL = !!process.env.RAW_URL ? process.env.RAW_URL : `https://raw.vodtv.cn` || `https://raw.viptv.work`

export const sites_matrix: TREADMEMirrorSitesMatrix = [
  {
    protocol: "https",
    url: "https://vodtv.cn",
    frequence: "per 2h",
    idc: "github",
    provider: "[vodtv](https://github.com/vodtv)",
  },
  {
    protocol: "https",
    url: "https://iptvjs.github.io",
    frequence: "per 2h",
    idc: "github",
    provider: "[iptvjs](https://github.com/iptvjs)",
  }
]

export const get_custom_url = () =>
  !!process.env.CUSTOM_URL ? process.env.CUSTOM_URL : "https://vodtv.cn"

export const get_rollback_urls = () => {
  const matrix_url = sites_matrix.map((m) => m.url)
  if (!process.env.ROLLBACK_URLS) {
    return ["https://vodtv.cn", ...matrix_url]
  }
  return process.env.ROLLBACK_URLS.split(",")
    .map((url) => url.trim())
    .concat(["https://vodtv.cn", ...matrix_url])
}


export const get_github_raw_proxy_url = () => {
  const custom = process.env.CUSTOM_GITHUB_RAW_SOURCE_PROXY_URL
  return !!custom ? custom : `https://ghproxy.net` || `https://mirror.ghproxy.com`
}

export const replace_github_raw_proxy_url = (s: string) => {
  const proxy_url = get_github_raw_proxy_url()
  return s.replace(
    /tvg\-logo="https:\/\/raw\.githubusercontent\.com\//g,
    `tvg-logo="${proxy_url}/https://raw.githubusercontent.com/`
  )
}

export const is_filted_channels = (s: string) => {
  if (s.includes("ABN")) {
    return true
  }
  if (s.includes("NTD")) {
    return true
  }
  return false
}

export const handle_m3u = (r: string) => {
  const raw = r
    .trim()
    .replace(/\r/g, "")
    .split("\n")
    .filter((r) => !!r)
  let result: string[] = []
  const extM3uRegExp = /#EXTM3U/
  const extinfRegExp = /#EXTINF:-1([^,]*),(.*)/
  const hostRegExp = /^([^:]+):\/\/([^/]+)/
  for (let i = 0; i < raw.length; i++) {
    if (extM3uRegExp.test(raw[i])) {
      result.push(raw[i])
      continue
    }
    if (extinfRegExp.test(raw[i]) && hostRegExp.test(raw[i + 1])) {
      result = result.concat([raw[i], raw[i + 1]])
      i++
      continue
    }
  }
  return result
}


export const with_github_raw_url_proxy = (u: string) => {
  return process.env.CLOSE_SOURCE_PROXY?.trim() === "true"
    ? u
    : `${get_github_raw_proxy_url()}/${u}`
}

export const replace_github_rawcontent = (url: string) => {
  return url.replace(
    "https://raw.githubusercontent.com/",
    "https://ghproxy.net/https://raw.githubusercontent.com/"
  );
};

export const get_channel_id = (extinf: string) => {
  const regExp = /\#EXTINF:-1([^,]*),(.*)/
  const name = converter(regExp.exec(extinf)![2]).toLowerCase()
  return name
    .replace(/\[([^\]]*)\]/g, "")
    .replace(/\(([^\)]*)\)/g, "")
    .replace(/（([^）]*)）/g, "")
    .replace(/「([^」]+)」/g, "")
    .replace(/\-/g, "")
    .replace(/\@\@[0-9]*/g, "")
    .replace(/Ⅰ/g, "")
    .replace(/ 8m/g, "")
    .replace(/([^\|]+)\|/g, "")
    .replace(/([^ⅰ]+)ⅰ/g, "")
    .replace(/([\u4e00-\u9fff]+)\s+([\u4e00-\u9fff]+)/g, "$1$2")
    .replace(/ +/g, " ")
    .trim()
};

export const collectM3uSource = (
  extinf: string,
  url: string,
  fn: (k: string, v: string) => void
) => {
  const id = get_channel_id(extinf)
  fn(id, url)
}

export const filter: ISource["filter"] = (
  raw,
  caller,
  collectFn
): [string, number] => {
  const rawArray = handle_m3u(replace_github_raw_proxy_url(raw)).filter((r) => !/#[^E]/.test(r))
  if (!/#EXTM3U/.test(rawArray[0])) {
    rawArray.unshift("#EXTM3U")
  }
  if (caller === "normal" && collectFn) {
    for (let i = 1; i < rawArray.length; i += 2) {
      collectM3uSource(rawArray[i], rawArray[i + 1], collectFn)
    }
  }
  return [converter(rawArray.join("\n")), (rawArray.length - 1) / 2]
}

export const Collector = (
  keyFilter?: (k: string) => boolean,
  valueFilter?: (v: string) => boolean
) => {
  let data = new Map<string, string[]>()
  return {
    collect: (k: string, v: string) => {
      if (!!keyFilter && keyFilter(k)) {
        return
      }
      if (!!valueFilter && valueFilter(v)) {
        return
      }
      if (data.has(k)) {
        const vb = data.get(k)
        if (!vb) {
          data.set(k, [v])
          return
        }
        if (!vb.includes(v)) {
          data.set(k, [...vb, v])
          return
        }
      } else {
        data.set(k, [v])
      }
    },
    result: () => {
      return data
    },
  }
}

export const m3u2txt = (m3uArray: string[]) => {
  let groups = new Map<string, string>()
  const channelRegExp = /\#EXTINF:-1([^,]*),(.*)/
  const groupRegExp = /group-title="([^"]*)"/
  for (let i = 1; i < m3uArray.length; i += 2) {
    const reg = channelRegExp.exec(m3uArray[i]) as RegExpExecArray
    const group = groupRegExp.exec(reg[1].trim())
    let g = ""
    if (!group) {
      g = "Undefined"
    } else {
      g = group[1].trim()
    }
    if (groups.has(g)) {
      groups.set(
        g,
        `${groups.get(g)}${reg[2].trim().replace(/\s+/g, "_")},${m3uArray[i + 1]
        }\n`
      )
    } else {
      groups.set(
        g,
        `${reg[2].trim().replace(/\s+/g, "_")},${m3uArray[i + 1]}\n`
      )
    }
  }
  let txt = ""
  groups.forEach((v, k) => {
    txt += `${k},#genre#\n${v}\n`
  })
  return txt.substring(0, txt.length - 2)
}

const from_infos = new Map([
  ["sn.chinamobile.com", "中国移动陕西"],
  ["sh.chinamobile.com", "中国移动上海"],
  ["hl.chinamobile.com", "中国移动黑龙江"],
  ["js.chinamobile.com", "中国移动江苏"],
  ["cztv.com", "浙江广播电视集团"],
  ["mobaibox.com", "中国移动江苏"],
  ["shaoxing.com.cn", "绍兴网"],
  ["cztvcloud.com", "新蓝云"],
  ["btzx.com.cn", "兵团在线网站"],
  ["hznet.tv", "菏泽网络电视台"],
  ["xntv.tv", "西宁网络电视台"],
  ["jlntv.cn", "吉林广播电视台"],
  ["ybtvyun.com", "延边广播电视台"],
  ["dxhmt.cn", "河南大象融媒体"],
  ["hebyun.com.cn", "冀云"],
  ["nntv.cn", "老友网"],
  ["sjzntv.cn", "燕赵名城网"],
  ["yjtvw.com", "阳江广播电视台"],
  ["amazonaws.com", "亚马逊AWS"],
  ["jstv.com", "荔枝网"],
  ["sgmsw.cn", "韶关民声网"],
  ["grtn.cn", "广东网络广播电视台"],
  ["nbs.cn", "南京广播电视台"],
  ["lsrmw.cn", "溧水融媒网"],
  ["zohi.tv", "福州明珠"],
  ["qingting.fm", "蜻蜓FM"],
  ["hhtv.cc", "云南红河发布"],
  ["wsrtv.com.cn", "文山州广播电视台"],
  ["xsbnrtv.cn", "西双版纳广播电视网"],
  ["live.yantaitv.cn", "烟台网络广播电视台"],
  ["cgtn.com", "CGTN"],
  ["cctv.com", "CCTV"],
  ["cctvplus.com", "CCTV+"],
  ["cnr.cn", "央广网"],
  ["cmvideo.cn", "咪咕"],
  ["douyucdn", "斗鱼"],
  ["cri.cn", "国际在线"],
  ["hndt.com", "河南广播网"],
  ["qxndt.com", "黔西南广播网"],
  ["olelive.com", "欧乐影院"],
  ["chinashadt.com", "千城云科"],
  ["aodianyun.com", "奥点云"],
  ["xiancity.cn", "西安网"],
  ["raw.githubusercontent.com", "Github Raw"],
])

export const get_from_info = (url: string) => {
  for (const [k, v] of from_infos) {
    if (url.includes(k)) {
      return v
    }
  }
  const hostRegExp = /([^:]+):\/\/([^/]+)/
  const host = hostRegExp.exec(url)![2]
  if (/^\[/.test(host)) {
    return "IPv6 直链"
  }
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(host)) {
    return "IPv4 直链"
  }
  return host
}

export const channels_logo = [
  "4K电影",
  "AMC",
  "ANIMAX",
  "ANIMAXHD",
  "AXN",
  "AnimalPlanet",
  "ArirangTV",
  "BBCEarth",
  "BBCLifestyle",
  "BBCWORLDNEWSASIA",
  "BLUEAntExtreme",
  "BOOMERANG",
  "BabyFirst",
  "BabyTV",
  "BeautifulLife",
  "BloombergTV",
  "BlueAntEntertainment",
  "CBN幸福剧场",
  "CBeebies",
  "CCTV1",
  "CCTV10",
  "CCTV11",
  "CCTV12",
  "CCTV13",
  "CCTV14",
  "CCTV15",
  "CCTV16",
  "CCTV17",
  "CCTV2",
  "CCTV3",
  "CCTV3D",
  "CCTV4",
  "CCTV4AME",
  "CCTV4EUO",
  "CCTV4K",
  "CCTV4欧洲",
  "CCTV4美洲",
  "CCTV5+",
  "CCTV5",
  "CCTV6",
  "CCTV7",
  "CCTV8",
  "CCTV8K",
  "CCTV9",
  "CETV1",
  "CETV2",
  "CETV3",
  "CETV4",
  "CGTN",
  "CGTNDoc",
  "CGTN俄语",
  "CGTN法语",
  "CGTN纪录",
  "CGTN西语",
  "CGTN记录",
  "CGTN阿语",
  "CHC动作电影",
  "CHC家庭影院",
  "CHC高清电影",
  "CI罪案侦查频道",
  "CNBC",
  "CNBCASIA财经台",
  "CNC",
  "CNCartoon",
  "CNN",
  "CNNNews",
  "CS",
  "CTS",
  "ChampionTV1",
  "ChampionTV2",
  "ChengSinTV",
  "ChengTeTV",
  "CinemaxHD",
  "CosmosBuddhistMissionaryTV",
  "CostarTV",
  "CrimeInvestigation",
  "CtiEntertainment",
  "CtiVariety",
  "DIVA",
  "DMAX",
  "DOX-CINEMA",
  "DOXTV",
  "DOX_YAQU",
  "DOX_xinzhi",
  "DW",
  "DaliTV",
  "Discovery-Asia",
  "DiscoveryHD",
  "Discovery科学",
  "Disney",
  "DisneyJunior",
  "EBCDrama",
  "EBCFinancialNews",
  "EBCMovies",
  "EBCNews",
  "EBCSuper",
  "EBCVariety",
  "EBCWesternMovies",
  "EBCYoYoTV",
  "EFTV",
  "ELEVENsports1",
  "ELTA_Ent",
  "ELTV生活英语台",
  "EVE",
  "EbcAsiaNews",
  "EbcAsiaWeishi",
  "FOXHD",
  "FOXMOVIES",
  "FOXSports",
  "FOXSports2",
  "FTV",
  "FTVNews",
  "FXHD",
  "FoodNetwork",
  "FoxFamilyMovies",
  "FoxLive",
  "FoxSports3",
  "GDTV3",
  "GDTV4",
  "GDTV6",
  "GDTV8",
  "GDTVECO",
  "GDTVENT",
  "GDTVMOV",
  "GDTVSHAO",
  "GTVDramaHD",
  "GTVEntertainment",
  "GTVOneHD",
  "GTVVarietyHD",
  "GlobalNews",
  "GoldSunTV",
  "GoodTV",
  "GoodTV2",
  "G导视",
  "HBLS",
  "HBO",
  "HBOFamily",
  "HBOHD",
  "HBOHits",
  "HBOSignature",
  "HGTV",
  "HISTORY",
  "HITS",
  "HMC",
  "HUBEI2",
  "HUBEI3",
  "HUBEI4",
  "HUBEI5",
  "HUBEI7",
  "HUBEI8",
  "HakkaTV",
  "History2",
  "HistoryChannel",
  "History历史频道",
  "HwaZanTV",
  "IFUN动漫台",
  "IHOT爱世界",
  "IHOT爱体育",
  "IHOT爱动漫",
  "IHOT爱历史",
  "IHOT爱喜剧",
  "IHOT爱奇谈",
  "IHOT爱娱乐",
  "IHOT爱家庭",
  "IHOT爱幼教",
  "IHOT爱怀旧",
  "IHOT爱悬疑",
  "IHOT爱探索",
  "IHOT爱旅行",
  "IHOT爱时尚",
  "IHOT爱极限",
  "IHOT爱江湖",
  "IHOT爱浪漫",
  "IHOT爱猎奇",
  "IHOT爱玩具",
  "IHOT爱电竞",
  "IHOT爱科学",
  "IHOT爱科幻",
  "IHOT爱经典",
  "IHOT爱美食",
  "IHOT爱解密",
  "IHOT爱谍战",
  "IHOT爱赛车",
  "IHOT爱都市",
  "IHOT爱院线",
  "IHOT爱青春",
  "IPTV3+",
  "IPTV5+",
  "IPTV6+",
  "IPTV8+",
  "IPTVEFEL",
  "IPTV少儿动画",
  "IPTV热播剧场",
  "IPTV相声小品",
  "IPTV经典电影",
  "IPTV魅力时尚",
  "J2",
  "JETVariety",
  "KMTV",
  "LNSY1",
  "LNTV-FINANCE",
  "LNTV-SPORT",
  "LNTV2",
  "LNTV3",
  "LNTV5",
  "LNTV6",
  "LNTV7",
  "LNTV8",
  "LSTIME",
  "Lifetime",
  "LoveNature",
  "MAX极速汽车",
  "MOMOkids",
  "MTV",
  "MTVLive",
  "MyCinemaEurope",
  "NEWTV东北热剧",
  "NEWTV中国功夫",
  "NEWTV军事评论",
  "NEWTV军旅剧场",
  "NEWTV古装剧场",
  "NEWTV家庭剧场",
  "NEWTV明星大片",
  "NEWTV欢乐剧场",
  "NEWTV武博世界",
  "NEWTV海外剧场",
  "NEWTV潮妈辣婆",
  "NEWTV炫舞未来",
  "NEWTV精品体育",
  "NEWTV精品大剧",
  "NEWTV精品纪录",
  "NEWTV超级体育",
  "NEWTV超级电影",
  "NEWTV超级电视剧",
  "NEWTV超级综艺",
  "NEWTV金牌综艺",
  "NEXTTVMovie",
  "NEXTTVZonghe",
  "NHK",
  "NHKWorld",
  "NOW新闻台",
  "NextTVNews",
  "NickJr",
  "Nickelodeon",
  "PiliPuppet",
  "PublicTV",
  "PublicTV2",
  "PublicTV3HD",
  "RTDoc",
  "RTHK31",
  "RTHK32",
  "RTNews",
  "SBN",
  "SETCity",
  "SETInews",
  "SETNews",
  "SETTaiwan",
  "SETZonghe",
  "SITV七彩戏剧",
  "SITV劲爆体育",
  "SITV极速汽车",
  "SITV法治天地",
  "SITV都市剧场",
  "SITV金色学堂",
  "SinDaTV",
  "SinJiTVHD",
  "SkyNews",
  "Smart知识台",
  "StarChineseMovies",
  "StarMoviesHD",
  "TACT",
  "TOPTVHD",
  "TRACESportStars",
  "TRT-World",
  "TVBJ2",
  "TVBS",
  "TVBS亚洲",
  "TVBS新闻",
  "TVBS欢乐",
  "TVBS精采",
  "TVBclassic",
  "TVB明珠台",
  "TVB星河",
  "TVB翡翠台",
  "TaiwanPlus",
  "ThaiPBS",
  "TienLiangTVHD",
  "UniqueNews",
  "UniqueUSTVHDUSTVHD",
  "VOA美国之音",
  "VideolandDrama",
  "VideolandJapanese",
  "VideolandMaxTV",
  "VideolandMovies",
  "VideolandOnTV",
  "VideolandSportsHD",
  "WETV",
  "WHTV1",
  "WHTV2",
  "WHTV3",
  "WHTV4",
  "WHTV5",
  "WHTV6",
  "WHTV7",
  "WarnerTV",
  "XFBY",
  "YANBIAN1",
  "ZChannel",
  "abcaus",
  "afc",
  "aljazeera",
  "anhui",
  "asiatravel",
  "asiazonghe",
  "beijing",
  "beijingjishi",
  "bestv",
  "bingtuan",
  "catchplay",
  "cdtv1",
  "cdtv2",
  "cdtv3",
  "cdtv4",
  "cdtv5",
  "cdtv6",
  "channelnewsasia",
  "channelv",
  "chongqing",
  "cinemaworld",
  "cmusic",
  "cnex",
  "cqccn",
  "daai",
  "daai2",
  "davinci",
  "dianjingtiantang",
  "discovery",
  "diyicaijing",
  "dongfang",
  "dongnan",
  "dox_juchang",
  "dox_xinyi",
  "dox_yijia",
  "dox_yinglun",
  "doxyinghua",
  "dreamworks",
  "eata_sports1",
  "eata_sports3",
  "elevensports2",
  "elta_sports2",
  "elta_yingju",
  "elta_zonghehd",
  "eltv",
  "emeidianying",
  "etoday",
  "euronews",
  "eurosport",
  "eyelvyou",
  "eyexiju",
  "fashionone",
  "fashiontv",
  "fenghuangxianggang",
  "fenghuangzhongwen",
  "fenghuangzixun",
  "fooldplanet",
  "france24",
  "ftv-1",
  "ftv-taiwan",
  "ftv-zongyi",
  "gansu",
  "gstv",
  "gtv_youxi",
  "guangdong",
  "guangxi",
  "guizhou",
  "hebei",
  "heilongjiang",
  "henan",
  "hkguojicaijing",
  "hks",
  "hongkong603",
  "hongkongkai",
  "huanghe",
  "huanxiao",
  "huanyucaijing",
  "huanyuzonghe",
  "huayi_yingju",
  "huayimbc",
  "hubei",
  "hunan",
  "ifun1",
  "ifun2",
  "ifun3",
  "jiajiakt",
  "jiangsu",
  "jiangxi",
  "jilin",
  "jinwenjiang",
  "jinyingjishi",
  "jinyingkatong",
  "jisuqiche",
  "kaku",
  "kangba",
  "lapse.mp4",
  "liaoning",
  "longhuadonghua",
  "loupe",
  "luxetv",
  "lvyou",
  "mandi_japan",
  "meilizuqiu",
  "meiyamovie",
  "mezzo",
  "mtvlivehd",
  "muzzikzz4000",
  "my101",
  "mykids",
  "nanfang",
  "natgeo",
  "natgeowild",
  "natlgeo",
  "nhkworldp",
  "ningxia",
  "outdoor",
  "qicaixiju",
  "qinghai",
  "quanjishi",
  "roller",
  "sansha",
  "sctv2",
  "sctv3",
  "sctv4",
  "sctv5",
  "sctv7",
  "sctv8",
  "sctv9",
  "sd_gonggong",
  "sd_nongke",
  "sd_qilu",
  "sd_shaoer",
  "sd_shenghuo",
  "sd_tiyu",
  "sd_yingshi",
  "sd_zongyi",
  "setxiju",
  "shandong",
  "shanghaidongfangyingshi",
  "shanghaijishi",
  "shanghaiwaiyu",
  "shangshixinwen",
  "shanxi",
  "shanxi_",
  "shenghuoshishang",
  "shengming",
  "shenzhen",
  "sichuan",
  "sport-golfplus",
  "sport-sports_net",
  "sport-trendsport",
  "sport_tennis",
  "sport_unlimited",
  "sport_unlimited2",
  "sports-golfch",
  "sports_net_2",
  "starmov",
  "starmovieyule",
  "starsports",
  "taiwanxiju",
  "tfc",
  "tianjin",
  "tlc",
  "traceurban",
  "travelchannel",
  "tv5monde",
  "tvN",
  "tvbfinanceinformationchannel",
  "viutv",
  "wangluoqipai",
  "weilaojingcai",
  "weixin",
  "wolvesvalley",
  "wuxingtiyu",
  "wxxw",
  "xiamen",
  "xindongman",
  "xingfucai",
  "xinjiang",
  "xizang",
  "xuandong",
  "yangguangweishi",
  "youman",
  "youxiancaijingzixun",
  "youxianxinwen",
  "youxifengyun",
  "yuanzhumin",
  "yunnan",
  "zgjt",
  "zhejiang",
  "zhujiang",
  "七彩戏剧",
  "三佳购物",
  "三沙卫视",
  "上海外语",
  "上海教育",
  "上海第一财经",
  "上海都市",
  "上视新闻",
  "世界地理",
  "东南卫视",
  "东方卫视",
  "东方影视",
  "东方财经",
  "东方购物",
  "东莞新闻综合",
  "东风卫视",
  "中华特产",
  "中华美食",
  "中国交通",
  "中国天气",
  "中国教育1台",
  "中国教育2台",
  "中国教育3台",
  "中国教育4台",
  "中天新闻台",
  "中学生",
  "中视",
  "中视新闻",
  "中视新闻台",
  "中视经典",
  "中视菁采",
  "中视购物",
  "之江记录",
  "乌兰察布",
  "乌海新闻综合",
  "乌海都市生活",
  "乐游",
  "书画",
  "云南卫视",
  "云南娱乐",
  "云南影视",
  "云南都市",
  "五星体育",
  "亚洲新闻",
  "京视剧场",
  "人间卫视",
  "优优宝贝",
  "优漫卡通",
  "优购物",
  "佛山公共",
  "佛山影视",
  "佛山综合",
  "先锋乒羽",
  "全纪实",
  "公视",
  "公视戏剧台",
  "兴安",
  "兵器科技",
  "兵团卫视",
  "内蒙古IPTV",
  "内蒙古农牧",
  "内蒙古卫视",
  "内蒙古少儿",
  "内蒙古文体娱乐",
  "内蒙古新闻综合",
  "内蒙古经济生活",
  "内蒙古蒙语卫视",
  "内蒙古蒙语文化",
  "农林卫视",
  "凤凰中文",
  "凤凰卫视中文台",
  "凤凰卫视电影台",
  "凤凰卫视资讯台",
  "凤凰卫视香港台",
  "凤凰资讯",
  "动漫秀场",
  "劲爆体育",
  "包头新闻综合",
  "包头生活服务",
  "包头经济频道",
  "北京IPTV4K",
  "北京体育休闲",
  "北京卫视",
  "北京影视",
  "北京文艺",
  "北京新闻",
  "北京生活",
  "北京纪实科教",
  "北京财经",
  "北京青年",
  "半岛新闻",
  "华视",
  "华视新闻",
  "华语影院",
  "南方卫视",
  "卡酷少儿",
  "卫生健康",
  "卫视中文",
  "卫视中文台",
  "厦门1",
  "厦门2",
  "厦门3",
  "厦门卫视",
  "发现之旅",
  "台视",
  "台视新闻",
  "台视综合",
  "台视财经",
  "吉林卫视",
  "呼伦贝尔",
  "呼伦贝尔文化旅游",
  "呼伦贝尔新闻综合",
  "呼伦贝尔生活资讯",
  "呼和浩特",
  "呼和浩特影视娱乐",
  "呼和浩特新闻综合",
  "呼和浩特都市生活",
  "咪咕体育",
  "咪咕音乐",
  "哈哈炫动",
  "哒啵电竞",
  "哒啵赛事",
  "嘉佳卡通",
  "四川乡村",
  "四川卫视",
  "四川妇女儿童",
  "四川影视文艺",
  "四川文化旅游",
  "四川新闻",
  "四川科教",
  "四川经济",
  "四海钓鱼",
  "国学",
  "增城电视台",
  "大湾区卫视",
  "大爱一台",
  "大爱电视",
  "天元围棋",
  "天津卫视",
  "央广购物",
  "央视台球",
  "央视高网",
  "女性时尚",
  "好享购物",
  "宁夏卫视",
  "安多卫视",
  "安徽公共",
  "安徽农业科教",
  "安徽卫视",
  "安徽国际",
  "安徽影视",
  "安徽经济生活",
  "安徽综艺体育",
  "家家购物",
  "家庭理财",
  "家有购物",
  "寰宇新闻",
  "山东体育",
  "山东农科",
  "山东卫视",
  "山东少儿",
  "山东教育",
  "山东文旅",
  "山东新闻",
  "山东生活",
  "山东综艺",
  "山东齐鲁",
  "山西卫视",
  "山西影视",
  "山西社会与法治",
  "山西经济",
  "山西黄河",
  "岭南戏曲",
  "巴彦淖尔影视娱乐",
  "巴彦淖尔新闻综合",
  "巴彦淖尔经济生活",
  "年代ERANewsHD",
  "年代MUCH",
  "幸福娱乐",
  "幸福空间居家台",
  "广东4K",
  "广东体育",
  "广东公共",
  "广东卫视",
  "广东嘉佳卡通",
  "广东少儿",
  "广东广电",
  "广东影视",
  "广东新闻",
  "广东民生",
  "广东珠江",
  "广东经济科教",
  "广东综艺",
  "广州影视",
  "广州新闻",
  "广州法治",
  "广州竞赛",
  "广州综合",
  "广西卫视",
  "康巴卫视",
  "延边卫视",
  "弈坛春秋",
  "影迷数位电影",
  "影迷电影",
  "影迷纪实",
  "快乐垂钓",
  "快乐购",
  "怀旧剧场",
  "成都公共",
  "成都影视文艺",
  "成都新闻综合",
  "成都经济资讯",
  "成都都市生活",
  "摄影",
  "收藏天下",
  "文化精品",
  "文物宝库",
  "新动漫",
  "新疆体育健康",
  "新疆卫视",
  "新疆少儿",
  "新疆汉语经济",
  "新疆汉语综艺",
  "新视觉",
  "无线新闻台",
  "无线财经台",
  "早期教育",
  "时尚购物",
  "明珠台",
  "星空卫视",
  "晴彩中原",
  "智林体育台",
  "杭锦旗综合",
  "欢笑剧场",
  "欢腾购物",
  "武术世界",
  "每日影院",
  "民视",
  "民视台湾台",
  "民视新闻台",
  "民视旅游台",
  "民视第一台",
  "民视综艺台",
  "求索动物",
  "求索生活",
  "求索科学",
  "求索纪录",
  "求索记录",
  "汕头经济",
  "汕头综合",
  "江苏休闲体育",
  "江苏优漫卡通",
  "江苏公共新闻",
  "江苏卫视",
  "江苏国际",
  "江苏城市",
  "江苏影视",
  "江苏教育电视台",
  "江苏综艺",
  "江西卫视",
  "江西少儿",
  "江西教育",
  "江西新闻",
  "江西经济生活",
  "汽摩",
  "河北卫视",
  "河南4K",
  "河南乡村",
  "河南公共",
  "河南卫视",
  "河南国际",
  "河南新闻",
  "河南梨园",
  "河南民生",
  "河南法治",
  "河南电视剧",
  "河南都市",
  "法治天地",
  "浙江卫视",
  "浙江国际",
  "浙江少儿",
  "浙江教科影视",
  "浙江数码时代",
  "浙江新闻",
  "浙江民生休闲",
  "浙江经济生活",
  "浦东电视台",
  "海南公共",
  "海南卫视",
  "海南少儿",
  "海南文旅",
  "海南经济",
  "海峡卫视",
  "海豚综合",
  "深圳卫视",
  "深圳都市",
  "清华",
  "游戏风云",
  "湖北卫视",
  "湖南卫视",
  "湖南国际",
  "湖南娱乐",
  "湖南教育",
  "湖南爱晚",
  "湖南电影",
  "湖南电视剧",
  "湖南经视",
  "湖南都市",
  "湖南金鹰卡通",
  "潮州综合",
  "澳亚卫视",
  "澳视澳门",
  "澳门莲花",
  "爱上4K",
  "爱尔达娱乐台",
  "爱看导视",
  "环球奇观",
  "环球旅游",
  "甘肃卫视",
  "生态环境",
  "生活时尚",
  "电竞.jpeg",
  "电竞天堂",
  "电视指南",
  "百事通",
  "百姓健康",
  "百视通",
  "福建公共",
  "福建少儿",
  "福建教育",
  "福建文体",
  "福建新闻",
  "福建旅游",
  "福建电视剧",
  "福建经济",
  "福建综合",
  "移动戏曲.PNG",
  "第一剧场",
  "精选",
  "纪实人文",
  "纯享4K",
  "置业频道",
  "翡翠台",
  "耀才财经",
  "老故事",
  "聚鲨环球精选",
  "芒果互娱",
  "苏州4K",
  "茶",
  "莲花卫视",
  "西安1",
  "西安丝路频道",
  "西安商务资讯",
  "西安影视频道",
  "西安教育",
  "西安新闻综合",
  "西安都市频道",
  "西藏卫视",
  "西藏藏语卫视",
  "视纳华仁纪实",
  "视纳华仁纪实频道",
  "证券服务",
  "财富天下",
  "贵州卫视",
  "赤峰",
  "赤峰影视娱乐",
  "赤峰新闻综合",
  "赤峰经济服务",
  "足球频道",
  "车迷",
  "辽宁卫视",
  "达拉特旗综合",
  "通辽",
  "通辽城市服务",
  "通辽新闻综合",
  "都市剧场",
  "鄂尔多斯",
  "鄂尔多斯新闻综合",
  "鄂尔多斯经济服务",
  "鄂尔多斯蒙语频道",
  "采昌影剧",
  "重广融媒",
  "重庆卫视",
  "重庆少儿",
  "重庆影视",
  "重庆文体娱乐",
  "重庆新农村",
  "重庆新闻",
  "重庆时尚生活",
  "重庆汽摩",
  "重庆社会与法",
  "重庆科教",
  "重庆移动",
  "金砖电视",
  "金色学堂",
  "金鹰卡通",
  "金鹰纪实",
  "钱江都市",
  "阿拉善",
  "陕西体育休闲",
  "陕西公共",
  "陕西卫视",
  "陕西影视",
  "陕西新闻资讯",
  "陕西生活",
  "陕西西部电影",
  "陕西都市青春",
  "陶瓷",
  "青海卫视",
  "靓妆",
  "靖天卡通",
  "靖天国际",
  "靖天戏剧",
  "靖天日本",
  "靖天日本台",
  "靖天映画",
  "靖天欢乐",
  "靖天电影",
  "靖天电影台",
  "靖天综合",
  "靖天育乐",
  "靖天资讯",
  "靖洋卡通",
  "靖洋戏剧",
  "风云剧场",
  "风云足球",
  "风云音乐",
  "风尚生活",
  "风尚购物",
  "香港卫视",
  "香港国际财经台",
  "高尔夫网球",
  "魅力足球",
  "黑莓动画",
  "黑莓电影",
  "黑龙江卫视",
  "龙华偶像",
  "龙华影剧",
  "龙华戏剧",
  "龙华日韩",
  "龙华日韩台",
  "龙华洋片",
  "龙华电影",
  "龙华经典",
]

const is_fmml_logo_channel = (c: string) => channels_logo.includes(c)

export const with_fmml_logo_channel = (c: string) =>
  is_fmml_logo_channel(c)
    ? `https://live.fanmingming.com/tv/${c}.png`
    : is_fmml_logo_channel(c.toLowerCase())
      ? `https://live.fanmingming.com/tv/${c.toLowerCase()}.png`
      : void 0

export const trimAny = (any: any) => {
  if (Array.isArray(any)) {
    return any.map((a: any) => {
      if (typeof a === "string") {
        return a.trim()
      }
      if (typeof a === "object") {
        return trimAny(a)
      }
    })
  }

  if (typeof any === "object") {
    return Object.fromEntries(
      Object.entries(any).map(([key, value]) => {
        if (typeof value === "string") {
          return [key, value.trim()]
        }
        if (typeof value === "object") {
          return [key, trimAny(value)]
        }
      })
    )
  }

  if (typeof any === "string") {
    return any.trim()
  }

  return any
}     
