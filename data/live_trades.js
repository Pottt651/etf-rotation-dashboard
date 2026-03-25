// 实盘交易记录（v3 标的池，2026-03-25 启动，10万初始资金）
// 手动维护：每次换仓后在此添加一条记录
// 字段说明: date(换仓日), action(switch/buy/sell), from_asset/from_code(卖出), to_asset/to_code(买入), price_bought(成交价), note
var LIVE_TRADES_DATA = [
  {
    "date":         "2026-03-25",
    "action":       "init",
    "from_asset":   "--",
    "from_code":    "--",
    "to_asset":     "银行ETF",
    "to_code":      "512800",
    "price_bought": "",
    "note":         "v3策略启动，初始资金10万，信号：银行ETF（唯一正动量）"
  }
];
