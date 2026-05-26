import type { SiteSettings } from "./types.js";

export const DEFAULT_BIRTHDAY_GREETING_TEMPLATES = [
  "祝 {names} 生日快乐！愿新的一岁眼里有光、心里有路，平安喜乐，也常有好消息抵达。",
  "今天把最亮的一颗星留给 {names}。愿{subject}被认真对待，被温柔记得，所行皆顺，所遇皆暖。",
  "{names}，生日快乐！愿这一岁有热爱撑腰，有朋友同行，有越来越多值得期待的明天。",
  "愿 {names} 的今天被快乐填满，愿新的一岁自在、笃定、闪闪发光。生日快乐！",
  "{names}，生日快乐！愿{subject}一路有晴天，也有可依靠的人；有小确幸，也有大收获。",
  "祝 {names} 新的一岁，心想有回音，努力有结果，日子有盼头，生活有热气。",
  "今天有 {count} 位星星被点亮。愿 {names} 在新的一岁里平安顺遂，万事可期。",
  "{names}，愿今天的祝福都落到实处：快乐是真的，健康是真的，被爱也是真的。",
  "生日快乐，{names}！愿{subject}保持热爱，也被生活温柔托住，慢慢靠近想去的地方。",
  "把最好的祝愿送给 {names}：愿新的一岁有自由、有底气、有明亮的心情。",
  "{names}，生日快乐！愿{subject}在普通日子里也能常常遇见惊喜，常常感到值得。",
  "愿 {names} 的新一岁少些烦恼，多些从容；少些赶路，多些风景。",
  "祝 {names} 生日快乐！愿{subject}做喜欢的事，见想见的人，成为更自在的自己。",
  "今天属于 {names}。愿{subject}被好运偏爱，被温暖围绕，被未来温柔以待。",
  "{names}，愿新的一岁所有认真都不被辜负，所有期待都慢慢开花。",
  "生日快乐，{names}！愿{subject}心里有星光，脚下有方向，身边有真诚的陪伴。",
  "祝 {names} 在新的一岁里，健康常在，笑意常在，好消息也常常在路上。",
  "愿 {names} 今天被祝福包围，也愿往后的每一天都有值得开心的小瞬间。",
  "{names}，生日快乐！愿{subject}有迎风生长的勇气，也有安稳放松的生活。",
  "把一整天的明亮送给 {names}。愿{subject}新岁胜旧岁，所念皆如愿。"
];

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: "星星生日墙",
  correctionContact: "如发现姓名、日期或农历规则有误，请联系管理员修正。",
  defaultUpcomingDays: 30,
  birthdayGreetingTemplates: [...DEFAULT_BIRTHDAY_GREETING_TEMPLATES]
};
